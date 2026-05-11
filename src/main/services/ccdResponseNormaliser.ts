/**
 * Canonicalises Yes/No values in CCD response payloads.
 *
 * CCD SDK's YesOrNo enum natively serialises PascalCase ("Yes"/"No"). pcs-api applies
 * a Jackson mixin to force UPPERCASE on the @Primary mapper for some endpoints, but
 * not others (see pcs-api PR #1678 / HDPI-6064). The FE has many strict `=== 'YES'`
 * compares that break when CCD echoes PascalCase. Canonicalising at the boundary
 * (CcdCaseModel constructor) keeps all downstream code working against a single,
 * stable casing.
 *
 * Walks the value structurally. Only whole-string matches against "yes"/"no" are
 * touched — free-text fields are left alone. NOT_SURE and other enum values come
 * through CCD already UPPERCASE so they aren't handled here.
 */
export function deepNormaliseYesNoCasing<T = unknown>(value: T): T {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    const upper = trimmed.toUpperCase();
    if (upper === 'YES' || upper === 'NO') {
      return upper as unknown as T;
    }
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(item => deepNormaliseYesNoCasing(item)) as unknown as T;
  }

  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
      result[key] = deepNormaliseYesNoCasing(v);
    }
    return result as unknown as T;
  }

  return value;
}
