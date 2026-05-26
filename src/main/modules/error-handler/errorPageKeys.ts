export type ErrorPageKey = 'pageNotFound' | 'serviceUnavailable' | 'technicalError' | 'accessDenied';

const PAGE_NOT_FOUND_STATUSES = [404, 410];
const SERVICE_UNAVAILABLE_STATUSES = [502, 503, 504, 429];
const ACCESS_DENIED_STATUSES = [400, 401, 403, 405, 409, 412, 415, 422];

export function getErrorPageKey(status: number): ErrorPageKey {
  if (PAGE_NOT_FOUND_STATUSES.includes(status)) {
    return 'pageNotFound';
  }
  if (SERVICE_UNAVAILABLE_STATUSES.includes(status)) {
    return 'serviceUnavailable';
  }
  if (ACCESS_DENIED_STATUSES.includes(status)) {
    return 'accessDenied';
  }
  if (status >= 500) {
    return 'technicalError';
  }
  return 'technicalError';
}
