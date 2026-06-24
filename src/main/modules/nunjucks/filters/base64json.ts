import { encodeBase64UrlJson } from '@utils/base64Json';

// base64url JSON for hidden form inputs.
export const base64json = (value: unknown): string => encodeBase64UrlJson(value);
