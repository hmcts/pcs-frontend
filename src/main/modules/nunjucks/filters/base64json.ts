import { encodeBase64UrlJson } from '@utils/base64Json';

// Serialises a value to base64url-encoded JSON for hidden form inputs (WAF-safe).
export const base64json = (value: unknown): string => encodeBase64UrlJson(value);
