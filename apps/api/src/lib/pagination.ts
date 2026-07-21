/**
 * Opaque cursor pagination. We encode the last item's (createdAt,id) as a
 * base64url cursor. Cursor pagination gives stable results when new rows are
 * inserted, which offset pagination does not (see docs/api-design.md).
 */
export interface Cursor {
  createdAt: string;
  id: string;
}

export function encodeCursor(c: Cursor): string {
  return Buffer.from(JSON.stringify(c), 'utf8').toString('base64url');
}

export function decodeCursor(raw?: string): Cursor | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
    if (typeof parsed?.createdAt === 'string' && typeof parsed?.id === 'string') {
      return parsed as Cursor;
    }
    return null;
  } catch {
    return null;
  }
}
