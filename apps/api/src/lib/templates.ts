/**
 * Minimal, safe template rendering for outbound messages.
 *
 * Deliberately NOT a full template engine: we support `{{variable}}`
 * placeholders only. Unknown placeholders are left blank (never throw), so a
 * badly-edited template degrades gracefully instead of blocking a send.
 * See docs/api-design.md → "Message templates".
 */
export type TemplateContext = Record<string, string | null | undefined>;

const PLACEHOLDER = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

export function renderTemplate(template: string, ctx: TemplateContext): string {
  return template.replace(PLACEHOLDER, (_m, key: string) => {
    const value = ctx[key];
    return value == null ? '' : String(value);
  });
}

/** The variables a template author may use. Kept small and documented. */
export const TEMPLATE_VARIABLES = [
  'customerName',
  'subject',
  'vehicle',
  'priceBand',
  'link',
  'expiresAt',
  'workspaceName',
  'workspaceContact',
] as const;
