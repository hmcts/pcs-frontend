import config from 'config';
import helmet from 'helmet';

import { securityHeaders } from '@modules/helmet';

// Mock config
jest.mock('config', () => ({
  get: jest.fn(),
}));

// Mock helmet
jest.mock('helmet', () => jest.fn());

describe('Helmet Module', () => {
  let mockConfigGet: jest.Mock;

  beforeEach(() => {
    mockConfigGet = jest.fn();

    (config.get as jest.Mock) = mockConfigGet;
    (helmet as jest.MockedFunction<typeof helmet>).mockReturnValue(jest.fn());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Development Mode', () => {
    it('should configure helmet with unsafe-eval and unsafe-inline for development', () => {
      mockConfigGet.mockImplementation((key: string) => {
        if (key === 'pcq.url') {
          return 'https://pcq.example.com';
        }
        if (key === 'oidc.issuer') {
          return 'https://idam.example.com/oauth2';
        }
        if (key === 'redirects.manageCaseReturnURL') {
          return 'https://manage.example.com/return';
        }
        if (key === 'cuiRa.url') {
          return 'https://cui-ra.example.com';
        }
        return undefined;
      });

      securityHeaders(true);

      expect(helmet).toHaveBeenCalledWith({
        contentSecurityPolicy: {
          directives: {
            connectSrc: ["'self'"],
            defaultSrc: ["'none'"],
            fontSrc: ["'self'", 'data:'],
            imgSrc: ["'self'", '*.google-analytics.com'],
            objectSrc: ["'self'"],
            scriptSrc: ["'self'", '*.google-analytics.com', "'unsafe-eval'", "'unsafe-inline'"],
            styleSrc: ["'self'"],
            manifestSrc: ["'self'"],
            formAction: [
              "'self'",
              'https://pcq.example.com',
              'https://idam.example.com',
              'https://manage.example.com',
              'https://cui-ra.example.com',
            ],
          },
        },
        referrerPolicy: { policy: 'origin' },
      });
    });

    it('should handle missing PCQ URL in development mode', () => {
      mockConfigGet.mockImplementation((key: string) => {
        if (key === 'oidc.issuer') {
          return 'https://idam.example.com/oauth2';
        }
        if (key === 'redirects.manageCaseReturnURL') {
          return 'https://manage.example.com/return';
        }
        if (key === 'cuiRa.url') {
          return 'https://cui-ra.example.com';
        }
        return undefined;
      });

      securityHeaders(true);

      expect(helmet).toHaveBeenCalledWith({
        contentSecurityPolicy: {
          directives: {
            connectSrc: ["'self'"],
            defaultSrc: ["'none'"],
            fontSrc: ["'self'", 'data:'],
            imgSrc: ["'self'", '*.google-analytics.com'],
            objectSrc: ["'self'"],
            scriptSrc: ["'self'", '*.google-analytics.com', "'unsafe-eval'", "'unsafe-inline'"],
            styleSrc: ["'self'"],
            manifestSrc: ["'self'"],
            formAction: [
              "'self'",
              'https://idam.example.com',
              'https://manage.example.com',
              'https://cui-ra.example.com',
            ],
          },
        },
        referrerPolicy: { policy: 'origin' },
      });
    });

    it('should handle missing IDAM issuer in development mode', () => {
      mockConfigGet.mockImplementation((key: string) => {
        if (key === 'pcq.url') {
          return 'https://pcq.example.com';
        }
        if (key === 'redirects.manageCaseReturnURL') {
          return 'https://manage.example.com/return';
        }
        if (key === 'cuiRa.url') {
          return 'https://cui-ra.example.com';
        }
        return undefined;
      });

      // This should throw an error when trying to create a URL from undefined
      expect(() => {
        securityHeaders(true);
      }).toThrow('Invalid URL');
    });

    it('should throw when manage case return URL is missing in development mode', () => {
      mockConfigGet.mockImplementation((key: string) => {
        if (key === 'pcq.url') {
          return 'https://pcq.example.com';
        }
        if (key === 'oidc.issuer') {
          return 'https://idam.example.com/oauth2';
        }
        return undefined;
      });

      expect(() => {
        securityHeaders(true);
      }).toThrow('Invalid URL');
    });

    it('should handle both PCQ and IDAM URLs missing in development mode', () => {
      mockConfigGet.mockReturnValue(undefined);

      // This should throw an error when trying to create a URL from undefined
      expect(() => {
        securityHeaders(true);
      }).toThrow('Invalid URL');
    });
  });

  describe('Production Mode', () => {
    it('should configure helmet with SHA hash for production', () => {
      mockConfigGet.mockImplementation((key: string) => {
        if (key === 'pcq.url') {
          return 'https://pcq.example.com';
        }
        if (key === 'oidc.issuer') {
          return 'https://idam.example.com/oauth2';
        }
        if (key === 'redirects.manageCaseReturnURL') {
          return 'https://manage.example.com/return';
        }
        if (key === 'cuiRa.url') {
          return 'https://cui-ra.example.com';
        }
        return undefined;
      });

      securityHeaders(false);

      expect(helmet).toHaveBeenCalledWith({
        contentSecurityPolicy: {
          directives: {
            connectSrc: ["'self'"],
            defaultSrc: ["'none'"],
            fontSrc: ["'self'", 'data:'],
            imgSrc: ["'self'", '*.google-analytics.com'],
            objectSrc: ["'self'"],
            scriptSrc: ["'self'", '*.google-analytics.com', "'sha256-GUQ5ad8JK5KmEWmROf3LZd9ge94daqNvd8xy9YS1iDw='"],
            styleSrc: ["'self'"],
            manifestSrc: ["'self'"],
            formAction: [
              "'self'",
              'https://pcq.example.com',
              'https://idam.example.com',
              'https://manage.example.com',
              'https://cui-ra.example.com',
            ],
          },
        },
        referrerPolicy: { policy: 'origin' },
      });
    });

    it('should handle missing PCQ URL in production mode', () => {
      mockConfigGet.mockImplementation((key: string) => {
        if (key === 'oidc.issuer') {
          return 'https://idam.example.com/oauth2';
        }
        if (key === 'redirects.manageCaseReturnURL') {
          return 'https://manage.example.com/return';
        }
        if (key === 'cuiRa.url') {
          return 'https://cui-ra.example.com';
        }
        return undefined;
      });

      securityHeaders(false);

      expect(helmet).toHaveBeenCalledWith({
        contentSecurityPolicy: {
          directives: {
            connectSrc: ["'self'"],
            defaultSrc: ["'none'"],
            fontSrc: ["'self'", 'data:'],
            imgSrc: ["'self'", '*.google-analytics.com'],
            objectSrc: ["'self'"],
            scriptSrc: ["'self'", '*.google-analytics.com', "'sha256-GUQ5ad8JK5KmEWmROf3LZd9ge94daqNvd8xy9YS1iDw='"],
            styleSrc: ["'self'"],
            manifestSrc: ["'self'"],
            formAction: [
              "'self'",
              'https://idam.example.com',
              'https://manage.example.com',
              'https://cui-ra.example.com',
            ],
          },
        },
        referrerPolicy: { policy: 'origin' },
      });
    });

    it('should handle missing IDAM issuer in production mode', () => {
      mockConfigGet.mockImplementation((key: string) => {
        if (key === 'pcq.url') {
          return 'https://pcq.example.com';
        }
        return undefined;
      });

      // This should throw an error when trying to create a URL from undefined
      expect(() => {
        securityHeaders(false);
      }).toThrow('Invalid URL');
    });

    it('should throw when manage case return URL is missing in production mode', () => {
      mockConfigGet.mockImplementation((key: string) => {
        if (key === 'pcq.url') {
          return 'https://pcq.example.com';
        }
        if (key === 'oidc.issuer') {
          return 'https://idam.example.com/oauth2';
        }
        return undefined;
      });

      expect(() => {
        securityHeaders(false);
      }).toThrow('Invalid URL');
    });

    it('should handle both PCQ and IDAM URLs missing in production mode', () => {
      mockConfigGet.mockReturnValue(undefined);

      // This should throw an error when trying to create a URL from undefined
      expect(() => {
        securityHeaders(false);
      }).toThrow('Invalid URL');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty PCQ URL', () => {
      mockConfigGet.mockImplementation((key: string) => {
        if (key === 'pcq.url') {
          return '';
        }
        if (key === 'oidc.issuer') {
          return 'https://idam.example.com/oauth2';
        }
        if (key === 'redirects.manageCaseReturnURL') {
          return 'https://manage.example.com/return';
        }
        if (key === 'cuiRa.url') {
          return 'https://cui-ra.example.com';
        }
        return undefined;
      });

      securityHeaders(false);

      expect(helmet).toHaveBeenCalledWith({
        contentSecurityPolicy: {
          directives: {
            connectSrc: ["'self'"],
            defaultSrc: ["'none'"],
            fontSrc: ["'self'", 'data:'],
            imgSrc: ["'self'", '*.google-analytics.com'],
            objectSrc: ["'self'"],
            scriptSrc: ["'self'", '*.google-analytics.com', "'sha256-GUQ5ad8JK5KmEWmROf3LZd9ge94daqNvd8xy9YS1iDw='"],
            styleSrc: ["'self'"],
            manifestSrc: ["'self'"],
            formAction: [
              "'self'",
              'https://idam.example.com',
              'https://manage.example.com',
              'https://cui-ra.example.com',
            ],
          },
        },
        referrerPolicy: { policy: 'origin' },
      });
    });

    it('should handle empty IDAM issuer', () => {
      mockConfigGet.mockImplementation((key: string) => {
        if (key === 'pcq.url') {
          return 'https://pcq.example.com';
        }
        if (key === 'oidc.issuer') {
          return '';
        }
        return undefined;
      });

      // This should throw an error when trying to create a URL from empty string
      expect(() => {
        securityHeaders(false);
      }).toThrow('Invalid URL');
    });

    it('should handle malformed IDAM issuer URL', () => {
      mockConfigGet.mockImplementation((key: string) => {
        if (key === 'pcq.url') {
          return 'https://pcq.example.com';
        }
        if (key === 'oidc.issuer') {
          return 'not-a-valid-url';
        }
        return undefined;
      });

      // This should throw an error when trying to create a URL from invalid string
      expect(() => {
        securityHeaders(false);
      }).toThrow();
    });
  });
});
