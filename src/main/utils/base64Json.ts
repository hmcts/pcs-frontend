// base64url so the WAF doesn't read JSON punctuation as SQLi (HDPI-5770).
export function encodeBase64UrlJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

// Accepts base64url or legacy raw JSON.
export function decodeBase64UrlJson(entry: string): Record<string, unknown> | null {
  const json = /^[A-Za-z0-9_-]+$/.test(entry) ? Buffer.from(entry, 'base64url').toString('utf8') : entry;
  try {
    const doc = JSON.parse(json);
    if (doc !== null && typeof doc === 'object' && !Array.isArray(doc)) {
      return doc as Record<string, unknown>;
    }
  } catch {
    // malformed input
  }
  return null;
}
