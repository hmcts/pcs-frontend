import { DASHBOARD_ROUTE, getDashboardUrl, isValidRedirectUrl } from '../../../../main/app/utils/routes';

describe('routes', () => {
  describe('isValidRedirectUrl', () => {
    it('should return true for valid relative paths', () => {
      expect(isValidRedirectUrl('/dashboard')).toBe(true);
      expect(isValidRedirectUrl('/steps/user-journey/test-step')).toBe(true);
      expect(isValidRedirectUrl('/dashboard/1765881343803991')).toBe(true);
    });

    it('should return false for null or undefined', () => {
      expect(isValidRedirectUrl(null)).toBe(false);
      expect(isValidRedirectUrl(undefined as unknown as string)).toBe(false);
    });

    it('should return false for non-string values', () => {
      expect(isValidRedirectUrl(123 as unknown as string)).toBe(false);
      expect(isValidRedirectUrl({} as unknown as string)).toBe(false);
    });

    it('should return false for paths not starting with /', () => {
      expect(isValidRedirectUrl('dashboard')).toBe(false);
      expect(isValidRedirectUrl('http://example.com')).toBe(false);
    });

    it('should return false for protocol-relative URLs', () => {
      expect(isValidRedirectUrl('//example.com')).toBe(false);
      expect(isValidRedirectUrl('//malicious.com/path')).toBe(false);
    });

    it('should return false for URLs with protocol schemes', () => {
      expect(isValidRedirectUrl('http://example.com')).toBe(false);
      expect(isValidRedirectUrl('https://example.com')).toBe(false);
      expect(isValidRedirectUrl('javascript:alert(1)')).toBe(false);
      expect(isValidRedirectUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
    });

    it('should return false for URLs containing null bytes', () => {
      expect(isValidRedirectUrl('/dashboard\0')).toBe(false);
      expect(isValidRedirectUrl('/\0path')).toBe(false);
    });

    it('should return false for URLs containing carriage returns or newlines', () => {
      expect(isValidRedirectUrl('/dashboard\r')).toBe(false);
      expect(isValidRedirectUrl('/dashboard\n')).toBe(false);
      expect(isValidRedirectUrl('/dashboard\r\n')).toBe(false);
    });
  });

  describe('getDashboardUrl', () => {
    it('should return default URL when no case reference provided', () => {
      expect(getDashboardUrl()).toBe(`${DASHBOARD_ROUTE}/1`);
      expect(getDashboardUrl(undefined)).toBe(`${DASHBOARD_ROUTE}/1`);
    });

    it('should return URL with valid 16-digit case reference', () => {
      expect(getDashboardUrl('1765881343803991')).toBe(`${DASHBOARD_ROUTE}/1765881343803991`);
      expect(getDashboardUrl(1765881343803991)).toBe(`${DASHBOARD_ROUTE}/1765881343803991`);
    });

    it('should return default URL for invalid case reference (too short)', () => {
      expect(getDashboardUrl('123')).toBe(`${DASHBOARD_ROUTE}/1`);
      expect(getDashboardUrl('12345')).toBe(`${DASHBOARD_ROUTE}/1`);
    });

    it('should return default URL for invalid case reference (too long)', () => {
      expect(getDashboardUrl('17658813438039912')).toBe(`${DASHBOARD_ROUTE}/1`);
      expect(getDashboardUrl('176588134380399123')).toBe(`${DASHBOARD_ROUTE}/1`);
    });

    it('should return default URL for invalid case reference (contains letters)', () => {
      expect(getDashboardUrl('176588134380399a')).toBe(`${DASHBOARD_ROUTE}/1`);
      expect(getDashboardUrl('abc1234567890123')).toBe(`${DASHBOARD_ROUTE}/1`);
    });

    it('should return default URL for invalid case reference (contains special characters)', () => {
      expect(getDashboardUrl('176588134380399-')).toBe(`${DASHBOARD_ROUTE}/1`);
      expect(getDashboardUrl('176588134380399_')).toBe(`${DASHBOARD_ROUTE}/1`);
      expect(getDashboardUrl('176588134380399.')).toBe(`${DASHBOARD_ROUTE}/1`);
    });

    it('should handle edge cases with empty strings', () => {
      expect(getDashboardUrl('')).toBe(`${DASHBOARD_ROUTE}/1`);
    });
  });
});
