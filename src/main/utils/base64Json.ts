// WAF-safe wire format for hidden form values.
// Azure Front Door's OWASP CRS SQLi rules false-positive on raw JSON
// ({ } " : , .pdf) carried as urlencoded POST args, so document metadata in
// `uploadedDocuments[]` is transported as opaque base64url instead.

export function encodeBase64UrlJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

// Tolerant: decodes base64url, but still accepts raw JSON (legacy hidden inputs
// and server-internal values that never crossed the WAF).
export function decodeBase64UrlJson(entry: string): Record<string, unknown> | null {
  const json = /^[A-Za-z0-9_-]+$/.test(entry) ? Buffer.from(entry, 'base64url').toString('utf8') : entry;
  try {
    const doc = JSON.parse(json);
    if (doc !== null && typeof doc === 'object' && !Array.isArray(doc)) {
      return doc as Record<string, unknown>;
    }
  } catch {
    // malformed hidden input
  }
  return null;
}
