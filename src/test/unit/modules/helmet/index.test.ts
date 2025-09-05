import config from 'config';
import * as express from 'express';
import helmet from 'helmet';

import { Helmet } from '../../../../main/modules/helmet';

// Mock config
jest.mock('config', () => ({
  get: jest.fn(),
}));

// Mock helmet
jest.mock('helmet', () => jest.fn());

describe('Helmet Module', () => {
  let mockApp: express.Express;
  let mockUse: jest.Mock;
  let mockConfigGet: jest.Mock;

  beforeEach(() => {
    mockUse = jest.fn();
    mockConfigGet = jest.fn();
    mockApp = {
      use: mockUse,
    } as unknown as express.Express;

    (config.get as jest.Mock) = mockConfigGet;
    (helmet as jest.MockedFunction<typeof helmet>).mockReturnValue('helmet-middleware' as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Development Mode', () => {
    it('should configure helmet with unsafe-eval and unsafe-inline for development', () => {
      const helmetInstance = new Helmet(true);
      mockConfigGet.mockImplementation((key: string) => {
        if (key === 'pcq.url') return 'https://pcq.example.com';
        if (key === 'oidc.issuer') return 'https://idam.example.com/oauth2';
        return undefined;
      });

      helmetInstance.enableFor(mockApp);

      expect(helmet).toHaveBeenCalledWith({
        contentSecurityPolicy: {
          directives: {
            connectSrc: ["'self'"],
            defaultSrc: ["'none'"],
            fontSrc: ["'self'", 'data:'],
            imgSrc: ["'self'", '*.google-analytics.com'],
            objectSrc: ["'self'"],
            scriptSrc: [
              "'self'",
              '*.google-analytics.com',
              "'unsafe-eval'",
              "'unsafe-inline'",
            ],
            styleSrc: ["'self'"],
            manifestSrc: ["'self'"],
            formAction: [
              "'self'",
              'https://pcq.example.com',
              'https://idam.example.com',
            ],
          },
        },
        referrerPolicy: { policy: 'origin' },
      });
      expect(mockApp.use).toHaveBeenCalledWith('helmet-middleware');
    });

    it('should handle missing PCQ URL in development mode', () => {
      const helmetInstance = new Helmet(true);
      mockConfigGet.mockImplementation((key: string) => {
        if (key === 'oidc.issuer') return 'https://idam.example.com/oauth2';
        return undefined;
      });

      helmetInstance.enableFor(mockApp);

      expect(helmet).toHaveBeenCalledWith({
        contentSecurityPolicy: {
          directives: {
            connectSrc: ["'self'"],
            defaultSrc: ["'none'"],
            fontSrc: ["'self'", 'data:'],
            imgSrc: ["'self'", '*.google-analytics.com'],
            objectSrc: ["'self'"],
            scriptSrc: [
              "'self'",
              '*.google-analytics.com',
              "'unsafe-eval'",
              "'unsafe-inline'",
            ],
            styleSrc: ["'self'"],
            manifestSrc: ["'self'"],
            formAction: ["'self'", 'https://idam.example.com'],
          },
        },
        referrerPolicy: { policy: 'origin' },
      });
    });

    it('should handle missing IDAM issuer in development mode', () => {
      const helmetInstance = new Helmet(true);
      mockConfigGet.mockImplementation((key: string) => {
        if (key === 'pcq.url') return 'https://pcq.example.com';
        return undefined;
      });

      // This should throw an error when trying to create a URL from undefined
      expect(() => {
        helmetInstance.enableFor(mockApp);
      }).toThrow('Invalid URL');
    });

    it('should handle both PCQ and IDAM URLs missing in development mode', () => {
      const helmetInstance = new Helmet(true);
      mockConfigGet.mockReturnValue(undefined);

      // This should throw an error when trying to create a URL from undefined
      expect(() => {
        helmetInstance.enableFor(mockApp);
      }).toThrow('Invalid URL');
    });
  });

  describe('Production Mode', () => {
    it('should configure helmet with SHA hash for production', () => {
      const helmetInstance = new Helmet(false);
      mockConfigGet.mockImplementation((key: string) => {
        if (key === 'pcq.url') return 'https://pcq.example.com';
        if (key === 'oidc.issuer') return 'https://idam.example.com/oauth2';
        return undefined;
      });

      helmetInstance.enableFor(mockApp);

      expect(helmet).toHaveBeenCalledWith({
        contentSecurityPolicy: {
          directives: {
            connectSrc: ["'self'"],
            defaultSrc: ["'none'"],
            fontSrc: ["'self'", 'data:'],
            imgSrc: ["'self'", '*.google-analytics.com'],
            objectSrc: ["'self'"],
            scriptSrc: [
              "'self'",
              '*.google-analytics.com',
              "'sha256-+6WnXIl4mbFTCARd8N3COQmT3bJJmo32N8q8ZSQAIcU='",
            ],
            styleSrc: ["'self'"],
            manifestSrc: ["'self'"],
            formAction: [
              "'self'",
              'https://pcq.example.com',
              'https://idam.example.com',
            ],
          },
        },
        referrerPolicy: { policy: 'origin' },
      });
      expect(mockApp.use).toHaveBeenCalledWith('helmet-middleware');
    });

    it('should handle missing PCQ URL in production mode', () => {
      const helmetInstance = new Helmet(false);
      mockConfigGet.mockImplementation((key: string) => {
        if (key === 'oidc.issuer') return 'https://idam.example.com/oauth2';
        return undefined;
      });

      helmetInstance.enableFor(mockApp);

      expect(helmet).toHaveBeenCalledWith({
        contentSecurityPolicy: {
          directives: {
            connectSrc: ["'self'"],
            defaultSrc: ["'none'"],
            fontSrc: ["'self'", 'data:'],
            imgSrc: ["'self'", '*.google-analytics.com'],
            objectSrc: ["'self'"],
            scriptSrc: [
              "'self'",
              '*.google-analytics.com',
              "'sha256-+6WnXIl4mbFTCARd8N3COQmT3bJJmo32N8q8ZSQAIcU='",
            ],
            styleSrc: ["'self'"],
            manifestSrc: ["'self'"],
            formAction: ["'self'", 'https://idam.example.com'],
          },
        },
        referrerPolicy: { policy: 'origin' },
      });
    });

    it('should handle missing IDAM issuer in production mode', () => {
      const helmetInstance = new Helmet(false);
      mockConfigGet.mockImplementation((key: string) => {
        if (key === 'pcq.url') return 'https://pcq.example.com';
        return undefined;
      });

      // This should throw an error when trying to create a URL from undefined
      expect(() => {
        helmetInstance.enableFor(mockApp);
      }).toThrow('Invalid URL');
    });

    it('should handle both PCQ and IDAM URLs missing in production mode', () => {
      const helmetInstance = new Helmet(false);
      mockConfigGet.mockReturnValue(undefined);

      // This should throw an error when trying to create a URL from undefined
      expect(() => {
        helmetInstance.enableFor(mockApp);
      }).toThrow('Invalid URL');
    });
  });

  describe('Constructor', () => {
    it('should store development mode flag correctly', () => {
      const developmentInstance = new Helmet(true);
      const productionInstance = new Helmet(false);

      // Test that the instances are created without errors
      expect(developmentInstance).toBeInstanceOf(Helmet);
      expect(productionInstance).toBeInstanceOf(Helmet);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty PCQ URL', () => {
      const helmetInstance = new Helmet(false);
      mockConfigGet.mockImplementation((key: string) => {
        if (key === 'pcq.url') return '';
        if (key === 'oidc.issuer') return 'https://idam.example.com/oauth2';
        return undefined;
      });

      helmetInstance.enableFor(mockApp);

      expect(helmet).toHaveBeenCalledWith({
        contentSecurityPolicy: {
          directives: {
            connectSrc: ["'self'"],
            defaultSrc: ["'none'"],
            fontSrc: ["'self'", 'data:'],
            imgSrc: ["'self'", '*.google-analytics.com'],
            objectSrc: ["'self'"],
            scriptSrc: [
              "'self'",
              '*.google-analytics.com',
              "'sha256-+6WnXIl4mbFTCARd8N3COQmT3bJJmo32N8q8ZSQAIcU='",
            ],
            styleSrc: ["'self'"],
            manifestSrc: ["'self'"],
            formAction: ["'self'", 'https://idam.example.com'],
          },
        },
        referrerPolicy: { policy: 'origin' },
      });
    });

    it('should handle empty IDAM issuer', () => {
      const helmetInstance = new Helmet(false);
      mockConfigGet.mockImplementation((key: string) => {
        if (key === 'pcq.url') return 'https://pcq.example.com';
        if (key === 'oidc.issuer') return '';
        return undefined;
      });

      // This should throw an error when trying to create a URL from empty string
      expect(() => {
        helmetInstance.enableFor(mockApp);
      }).toThrow('Invalid URL');
    });

    it('should handle malformed IDAM issuer URL', () => {
      const helmetInstance = new Helmet(false);
      mockConfigGet.mockImplementation((key: string) => {
        if (key === 'pcq.url') return 'https://pcq.example.com';
        if (key === 'oidc.issuer') return 'not-a-valid-url';
        return undefined;
      });

      // This should throw an error when trying to create a URL from invalid string
      expect(() => {
        helmetInstance.enableFor(mockApp);
      }).toThrow();
    });
  });
});
