import type { Response } from 'express';

import { safeRedirect303 } from '../../../main/utils/safeRedirect';

describe('safeRedirect303', () => {
  let mockRes: Partial<Response>;
  let redirectSpy: jest.Mock;

  beforeEach(() => {
    redirectSpy = jest.fn();
    mockRes = {
      redirect: redirectSpy,
    };
  });

  describe('Valid internal redirects', () => {
    it('should redirect to valid dashboard URL', () => {
      safeRedirect303(mockRes as Response, '/dashboard/1234567890123456', '/', ['/dashboard']);
      expect(redirectSpy).toHaveBeenCalledWith(303, '/dashboard/1234567890123456');
    });

    it('should redirect to valid case URL', () => {
      safeRedirect303(mockRes as Response, '/case/1234567890123456/respond-to-claim/start-now', '/', ['/case/']);
      expect(redirectSpy).toHaveBeenCalledWith(303, '/case/1234567890123456/respond-to-claim/start-now');
    });

    it('should redirect to root path', () => {
      safeRedirect303(mockRes as Response, '/', '/', ['/']);
      expect(redirectSpy).toHaveBeenCalledWith(303, '/');
    });

    it('should allow multiple prefixes and match the correct one', () => {
      safeRedirect303(mockRes as Response, '/case/123/step', '/', ['/dashboard', '/case/', '/login']);
      expect(redirectSpy).toHaveBeenCalledWith(303, '/case/123/step');
    });
  });

  describe('Security: Blocks absolute URLs', () => {
    ['http://evil.com', 'https://evil.com', 'ftp://evil.com', 'javascript:alert(1)'].forEach(url => {
      it(`should block ${url} URLs and redirect to fallback`, () => {
        safeRedirect303(mockRes as Response, url, '/', ['/']);
        expect(redirectSpy).toHaveBeenCalledWith(303, '/');
      });
    });
  });

  describe('Security: Blocks protocol-relative URLs', () => {
    ['//evil.com', '//evil.com/path'].forEach(url => {
      it(`should block ${url} URLs and redirect to fallback`, () => {
        safeRedirect303(mockRes as Response, url, '/', ['/']);
        expect(redirectSpy).toHaveBeenCalledWith(303, '/');
      });
    });
  });

  describe('Security: Enforces allowlist', () => {
    it('should block paths not in allowlist', () => {
      safeRedirect303(mockRes as Response, '/admin/users', '/', ['/dashboard', '/case/']);
      expect(redirectSpy).toHaveBeenCalledWith(303, '/');
    });

    it('should allow path that matches allowlist prefix', () => {
      safeRedirect303(mockRes as Response, '/dashboard/anything/here', '/', ['/dashboard']);
      expect(redirectSpy).toHaveBeenCalledWith(303, '/dashboard/anything/here');
    });
  });

  describe('Security: URL encoding attacks', () => {
    it('should block CRLF injection attempts with encoded newlines', () => {
      safeRedirect303(mockRes as Response, '/dashboard%0D%0ALocation:http://script.com', '/', ['/dashboard']);
      expect(redirectSpy).toHaveBeenCalledWith(303, '/');
    });

    it('should block double-slash attempts with encoded slashes', () => {
      safeRedirect303(mockRes as Response, '%2F%2Fscript.com', '/', ['/']);
      expect(redirectSpy).toHaveBeenCalledWith(303, '/');
    });

    it('should block absolute URLs with encoded protocol', () => {
      safeRedirect303(mockRes as Response, 'http%3A%2F%2Fscript.com', '/', ['/']);
      expect(redirectSpy).toHaveBeenCalledWith(303, '/');
    });
  });

  describe('Type validation', () => {
    [null, undefined, 123, { url: '/dashboard' }].forEach(value => {
      it(`should handle non-string target ${JSON.stringify(value)} and redirect to fallback`, () => {
        safeRedirect303(mockRes as Response, value, '/', ['/']);
        expect(redirectSpy).toHaveBeenCalledWith(303, '/');
      });
    });
  });

  describe('Fallback behavior', () => {
    it('should use custom fallback when provided', () => {
      safeRedirect303(mockRes as Response, 'http://evil.com', '/dashboard', ['/']);
      expect(redirectSpy).toHaveBeenCalledWith(303, '/dashboard');
    });

    it('should use default fallback (/) when not provided', () => {
      safeRedirect303(mockRes as Response, 'http://evil.com');
      expect(redirectSpy).toHaveBeenCalledWith(303, '/');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty string and redirect to fallback', () => {
      safeRedirect303(mockRes as Response, '', '/', ['/']);
      expect(redirectSpy).toHaveBeenCalledWith(303, '/');
    });

    it('should handle path with query parameters', () => {
      safeRedirect303(mockRes as Response, '/dashboard/123?lang=en', '/', ['/dashboard']);
      expect(redirectSpy).toHaveBeenCalledWith(303, '/dashboard/123?lang=en');
    });

    it('should handle path with hash fragment', () => {
      // Note: hash fragment is stripped by safeRedirect303
      safeRedirect303(mockRes as Response, '/dashboard/123#section', '/', ['/dashboard']);
      expect(redirectSpy).toHaveBeenCalledWith(303, '/dashboard/123');
    });

    it('should handle encoded URLs that are still relative', () => {
      // Note: %2F becomes decoded to a normal slash
      safeRedirect303(mockRes as Response, '/dashboard/%2F123', '/', ['/dashboard']);
      expect(redirectSpy).toHaveBeenCalledWith(303, '/dashboard//123');
    });

    it('should block path traversal attempts that do not match allowlist', () => {
      // Path traversal is normalized and blocked
      safeRedirect303(mockRes as Response, '/dashboard/../../etc/passwd', '/', ['/dashboard']);
      expect(redirectSpy).toHaveBeenCalledWith(303, '/');
    });
  });
});
