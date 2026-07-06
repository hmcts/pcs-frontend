import { encodeBase64UrlJson } from '@utils/base64Json';

export const base64json = (value: unknown): string => encodeBase64UrlJson(value);
