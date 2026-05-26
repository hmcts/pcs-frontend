import { getErrorPageKey } from '@modules/error-handler/errorPageKeys';

describe('getErrorPageKey', () => {
  it('returns pageNotFound for 404 and 410', () => {
    expect(getErrorPageKey(404)).toBe('pageNotFound');
    expect(getErrorPageKey(410)).toBe('pageNotFound');
  });

  it('returns serviceUnavailable for 502, 503, 504 and 429', () => {
    expect(getErrorPageKey(502)).toBe('serviceUnavailable');
    expect(getErrorPageKey(503)).toBe('serviceUnavailable');
    expect(getErrorPageKey(504)).toBe('serviceUnavailable');
    expect(getErrorPageKey(429)).toBe('serviceUnavailable');
  });

  it('returns accessDenied for client error statuses', () => {
    expect(getErrorPageKey(400)).toBe('accessDenied');
    expect(getErrorPageKey(401)).toBe('accessDenied');
    expect(getErrorPageKey(403)).toBe('accessDenied');
    expect(getErrorPageKey(405)).toBe('accessDenied');
    expect(getErrorPageKey(409)).toBe('accessDenied');
    expect(getErrorPageKey(412)).toBe('accessDenied');
    expect(getErrorPageKey(415)).toBe('accessDenied');
    expect(getErrorPageKey(422)).toBe('accessDenied');
  });

  it('returns technicalError for server error statuses', () => {
    expect(getErrorPageKey(500)).toBe('technicalError');
    expect(getErrorPageKey(501)).toBe('technicalError');
    expect(getErrorPageKey(505)).toBe('technicalError');
  });
});
