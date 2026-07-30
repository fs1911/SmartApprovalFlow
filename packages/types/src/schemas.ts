/**
 * Zod schemas — runtime validation + inferred TypeScript types.
 *
 * The API validates all input against these schemas and the web app reuses
 * them for form validation, so client and server never drift.
 */
import { z } from 'zod';
import { CUSTOMER_DECISION, ITEM_CATEGORY, ROLES, URGENCY } from './enums.js';

/** Swiss/DACH-friendly, deliberately permissive contact fields. */
const emailSchema = z.string().email().max(254);
const phoneSchema = z
  .string()
  .min(6)
  .max(20)
  .regex(/^[+0-9 ()/-]+$/, 'Ungültiges Telefonformat');

export const priceBandSchema = z
  .object({
    /** Lower bound in minor units (Rappen/cents), inclusive. */
    minMinor: z.number().int().nonnegative(),
    /** Upper bound in minor units (Rappen/cents), inclusive. */
    maxMinor: z.number().int().nonnegative(),
    /** ISO 4217, default CHF. */
    currency: z.string().length(3).default('CHF'),
  })
  .refine((v) => v.maxMinor >= v.minMinor, {
    message: 'maxMinor muss >= minMinor sein',
    path: ['maxMinor'],
  });
export type PriceBand = z.infer<typeof priceBandSchema>;

export const approvalItemInputSchema = z.object({
  title: z.string().min(2).max(160),
  description: z.string().max(2000).optional(),
  category: z.enum(ITEM_CATEGORY).default('REPAIR'),
  priceBand: priceBandSchema.optional(),
  /** Attachment ids already uploaded and belonging to this workspace. */
  attachmentIds: z.array(z.string().uuid()).max(20).default([]),
});
export type ApprovalItemInput = z.infer<typeof approvalItemInputSchema>;

export const customerInputSchema = z
  .object({
    name: z.string().min(1).max(160),
    email: emailSchema.optional(),
    phone: phoneSchema.optional(),
  })
  .refine((v) => v.email || v.phone, {
    message: 'Mindestens E-Mail oder Telefon ist erforderlich',
    path: ['email'],
  });
export type CustomerInput = z.infer<typeof customerInputSchema>;

export const vehicleInputSchema = z.object({
  plate: z.string().min(1).max(16).optional(),
  vin: z.string().length(17).optional(),
  make: z.string().max(60).optional(),
  model: z.string().max(60).optional(),
  year: z.number().int().min(1950).max(2100).optional(),
});
export type VehicleInput = z.infer<typeof vehicleInputSchema>;

/** Payload to create an ApprovalCase (POST /api/v1/approval-cases). */
export const createApprovalCaseSchema = z.object({
  subject: z.string().min(2).max(200),
  description: z.string().max(4000).optional(),
  urgency: z.enum(URGENCY).default('MEDIUM'),
  customer: customerInputSchema,
  vehicle: vehicleInputSchema.optional(),
  items: z.array(approvalItemInputSchema).min(1).max(30),
  /** If true, the API issues a link and marks the case SENT immediately. */
  sendImmediately: z.boolean().default(false),
});
export type CreateApprovalCaseInput = z.infer<typeof createApprovalCaseSchema>;

/** Payload for the loginless customer response (whole-case decision). */
export const customerRespondSchema = z.object({
  decision: z.enum(CUSTOMER_DECISION),
  /** Optional free-text note from the customer. */
  note: z.string().max(1000).optional(),
  /** Optional callback phone when decision === 'CALLBACK'. */
  callbackPhone: phoneSchema.optional(),
});
export type CustomerRespondInput = z.infer<typeof customerRespondSchema>;

/**
 * Payload for the per-item customer response (Block 8). The customer decides
 * each listed position individually; the case status is aggregated server-side.
 */
export const customerRespondItemsSchema = z.object({
  items: z
    .array(
      z.object({
        itemId: z.string().uuid(),
        decision: z.enum(CUSTOMER_DECISION),
      }),
    )
    .min(1)
    .max(30),
  note: z.string().max(1000).optional(),
  callbackPhone: phoneSchema.optional(),
});
export type CustomerRespondItemsInput = z.infer<typeof customerRespondItemsSchema>;

/**
 * Register an attachment (Block 8). The row is created first; the client then
 * PUTs the bytes to the returned signed upload URL. Content-type and size are
 * validated again server-side when the bytes arrive.
 */
export const createAttachmentSchema = z.object({
  fileName: z.string().min(1).max(200),
  contentType: z
    .string()
    .regex(/^image\/(jpeg|png|webp|heic|heif)$/, 'Nur Bildformate (JPEG, PNG, WebP, HEIC) erlaubt'),
  sizeBytes: z
    .number()
    .int()
    .positive()
    .max(15 * 1024 * 1024, 'Datei ist zu gross (max. 15 MB)'),
  /** Optional: attach to a single position instead of the whole case. */
  approvalItemId: z.string().uuid().optional(),
});
export type CreateAttachmentInput = z.infer<typeof createAttachmentSchema>;

// --- Onboarding: invitations & password reset (Block 10) -------------------

/** A reasonably strong password without being hostile (Swiss/DACH B2B). */
const passwordSchema = z.string().min(8).max(200);

/** Invite a new member (POST /api/v1/invitations). OWNER role excluded here —
 *  ownership is transferred explicitly, not invited. */
export const inviteCreateSchema = z.object({
  email: emailSchema,
  role: z.enum(ROLES).refine((r) => r !== 'OWNER', {
    message: 'Die Inhaber-Rolle kann nicht per Einladung vergeben werden.',
  }),
  name: z.string().min(1).max(160).optional(),
});
export type InviteCreateInput = z.infer<typeof inviteCreateSchema>;

/** Accept an invitation and set a password (loginless). */
export const inviteAcceptSchema = z.object({
  token: z.string().min(10),
  name: z.string().min(1).max(160).optional(),
  password: passwordSchema,
});
export type InviteAcceptInput = z.infer<typeof inviteAcceptSchema>;

/** Request a password reset (loginless, uniform response). */
export const passwordForgotSchema = z.object({ email: emailSchema });
export type PasswordForgotInput = z.infer<typeof passwordForgotSchema>;

/** Complete a password reset with a token (loginless). */
export const passwordResetSchema = z.object({
  token: z.string().min(10),
  password: passwordSchema,
});
export type PasswordResetInput = z.infer<typeof passwordResetSchema>;

// --- Collaboration (Block 14) ----------------------------------------------

/** Assign (or unassign, with null) a case to a team member. */
export const assignCaseSchema = z.object({
  assigneeUserId: z.string().uuid().nullable(),
});
export type AssignCaseInput = z.infer<typeof assignCaseSchema>;

/** Add an internal note to a case. */
export const createNoteSchema = z.object({
  body: z.string().min(1).max(4000),
});
export type CreateNoteInput = z.infer<typeof createNoteSchema>;

/** Common list query params for cursor pagination. */
export const listQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.string().optional(),
});
export type ListQuery = z.infer<typeof listQuerySchema>;

// --- Voice capture (Block 21) ----------------------------------------------
// The mechanic dictates the extra work; it is transcribed and parsed into a
// draft that pre-fills the create-case form. Everything runs locally with the
// `mock` transcription provider (no external account).

/** One suggested position parsed from the dictation (user edits before saving). */
export const voiceDraftItemSchema = z.object({
  title: z.string().min(1).max(160),
  priceBand: priceBandSchema.optional(),
});
export type VoiceDraftItem = z.infer<typeof voiceDraftItemSchema>;

/** Structured draft the parser derives from a transcript. Advisory only —
 * the real create-case schema still validates on submit. */
export const voiceDraftSchema = z.object({
  subject: z.string().max(200),
  description: z.string().max(4000).optional(),
  urgency: z.enum(URGENCY).default('MEDIUM'),
  items: z.array(voiceDraftItemSchema).max(30).default([]),
});
export type VoiceDraft = z.infer<typeof voiceDraftSchema>;

/** Request body for POST /voice/transcribe. Either real audio (base64) or, for
 * local/dev use with the mock provider, a transcript supplied directly. */
export const voiceTranscribeRequestSchema = z
  .object({
    /** Base64-encoded audio bytes (used by real providers). */
    audioBase64: z.string().max(20_000_000).optional(),
    contentType: z.string().max(100).optional(),
    durationSec: z.number().nonnegative().max(3600).optional(),
    /** Dev/mock convenience: the transcript text itself. Ignored by real
     * providers, which transcribe the audio. */
    mockTranscript: z.string().max(8000).optional(),
  })
  .refine((v) => !!v.audioBase64 || !!v.mockTranscript, {
    message: 'audioBase64 oder mockTranscript erforderlich',
    path: ['audioBase64'],
  });
export type VoiceTranscribeRequest = z.infer<typeof voiceTranscribeRequestSchema>;

/** Response of POST /voice/transcribe. */
export const voiceTranscribeResultSchema = z.object({
  id: z.string().optional(),
  transcript: z.string(),
  language: z.string().optional(),
  durationSec: z.number().optional(),
  provider: z.string(),
  draft: voiceDraftSchema,
});
export type VoiceTranscribeResult = z.infer<typeof voiceTranscribeResultSchema>;
