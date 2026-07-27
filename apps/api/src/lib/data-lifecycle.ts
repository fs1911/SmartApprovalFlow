/**
 * Data lifecycle (Block 15): GDPR-style export + erasure and case retention.
 *
 * `caseRetentionCutoff` and `shapeCaseExport` are pure (unit-tested). `eraseCase`
 * and `eraseCustomer` perform cascading hard deletes in a transaction and are
 * tenant-scoped. Erasure is irreversible — callers must gate it (permission +
 * explicit confirm).
 */
import { prisma } from '@saf/db';

/** Terminal statuses eligible for retention-based erasure. */
export const TERMINAL_STATUSES = ['APPROVED', 'PARTIALLY_APPROVED', 'DECLINED', 'EXPIRED', 'CANCELLED'];

/** Cases closed before this instant may be erased. null → retention disabled. */
export function caseRetentionCutoff(months: number, now: Date = new Date()): Date | null {
  if (!months || months <= 0) return null;
  const d = new Date(now);
  d.setMonth(d.getMonth() - months);
  return d;
}

/** Shape a loaded case into a portable export object (pure). */
export function shapeCaseExport(c: {
  reference: string;
  subject: string;
  description: string | null;
  status: string;
  urgency: string;
  createdAt: Date;
  sentAt: Date | null;
  respondedAt: Date | null;
  customer: { name: string; email: string | null; phone: string | null } | null;
  vehicle: { plate: string | null; make: string | null; model: string | null; year: number | null } | null;
  items: { title: string; description: string | null; category: string; priceMinMinor: number | null; priceMaxMinor: number | null; currency: string; decision: string | null }[];
  decisions: { decision: string; note: string | null; createdAt: Date }[];
  attachments: { fileName: string; contentType: string; sizeBytes: number; createdAt: Date }[];
  auditEvents: { type: string; actorType: string; actorLabel: string | null; createdAt: Date }[];
}) {
  return {
    reference: c.reference,
    subject: c.subject,
    description: c.description,
    status: c.status,
    urgency: c.urgency,
    createdAt: c.createdAt.toISOString(),
    sentAt: c.sentAt?.toISOString() ?? null,
    respondedAt: c.respondedAt?.toISOString() ?? null,
    customer: c.customer,
    vehicle: c.vehicle,
    items: c.items,
    decisions: c.decisions.map((d) => ({ ...d, createdAt: d.createdAt.toISOString() })),
    attachments: c.attachments.map((a) => ({ ...a, createdAt: a.createdAt.toISOString() })),
    auditTrail: c.auditEvents.map((e) => ({
      type: e.type,
      actorType: e.actorType,
      actorLabel: e.actorLabel,
      at: e.createdAt.toISOString(),
    })),
  };
}

const CASE_EXPORT_INCLUDE = {
  customer: { select: { name: true, email: true, phone: true } },
  vehicle: { select: { plate: true, make: true, model: true, year: true } },
  items: {
    orderBy: { sortOrder: 'asc' as const },
    select: {
      title: true,
      description: true,
      category: true,
      priceMinMinor: true,
      priceMaxMinor: true,
      currency: true,
      decision: true,
    },
  },
  decisions: { orderBy: { createdAt: 'asc' as const }, select: { decision: true, note: true, createdAt: true } },
  attachments: { select: { fileName: true, contentType: true, sizeBytes: true, createdAt: true } },
  auditEvents: {
    orderBy: { createdAt: 'asc' as const },
    select: { type: true, actorType: true, actorLabel: true, createdAt: true },
  },
};

/** Load + shape a single case for export (tenant-scoped). Returns null if missing. */
export async function exportCase(tenantId: string, caseId: string) {
  const c = await prisma.approvalCase.findFirst({
    where: { id: caseId, tenantId },
    include: CASE_EXPORT_INCLUDE,
  });
  return c ? shapeCaseExport(c) : null;
}

/** Load + shape all of a customer's data for export (tenant-scoped). */
export async function exportCustomer(tenantId: string, customerId: string) {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, tenantId },
    select: { id: true, name: true, email: true, phone: true, createdAt: true },
  });
  if (!customer) return null;
  const cases = await prisma.approvalCase.findMany({
    where: { tenantId, customerId },
    include: CASE_EXPORT_INCLUDE,
    orderBy: { createdAt: 'asc' },
  });
  return {
    customer: { ...customer, createdAt: customer.createdAt.toISOString() },
    cases: cases.map(shapeCaseExport),
    exportedAt: new Date().toISOString(),
  };
}

/** Hard-delete one case and its children (cascade via FKs). Tenant-scoped. */
export async function eraseCase(tenantId: string, caseId: string): Promise<boolean> {
  const c = await prisma.approvalCase.findFirst({ where: { id: caseId, tenantId }, select: { id: true } });
  if (!c) return false;
  await prisma.approvalCase.delete({ where: { id: caseId } });
  return true;
}

/**
 * Erase a customer: delete their cases (cascades items/decisions/attachments/
 * notes/audit), their vehicles, then the customer. Tenant-scoped.
 */
export async function eraseCustomer(tenantId: string, customerId: string): Promise<{ erased: boolean; cases: number }> {
  const customer = await prisma.customer.findFirst({ where: { id: customerId, tenantId }, select: { id: true } });
  if (!customer) return { erased: false, cases: 0 };
  return prisma.$transaction(async (tx) => {
    const del = await tx.approvalCase.deleteMany({ where: { tenantId, customerId } });
    await tx.vehicle.deleteMany({ where: { tenantId, customerId } });
    await tx.customer.delete({ where: { id: customerId } });
    return { erased: true, cases: del.count };
  });
}
