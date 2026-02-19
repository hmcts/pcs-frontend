import type { NextFunction, Request, Response } from 'express';

import type { FormFieldConfig } from '../../../../../main/interfaces/formFieldConfig.interface';
import { createPostHandler } from '../../../../../main/modules/steps/formBuilder/postHandler';
import * as dashboardModule from '../../../../../main/routes/dashboard';

jest.mock('../../../../../main/routes/dashboard');
jest.mock('../../../../../main/modules/i18n');
jest.mock('../../../../../main/modules/steps/flow');

describe('PostHandler - Save for Later Fix', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let fields: FormFieldConfig[];

  beforeEach(() => {
    mockRequest = {
      body: {},
      session: {
        formData: {},
        user: {
          accessToken: 'test-token',
          idToken: 'test-id-token',
          refreshToken: 'test-refresh-token',
          sub: 'test-user-id',
        },
      },
      res: {
        locals: {
          validatedCase: { id: '1771325608502536' },
        },
      },
      app: {
        locals: {
          nunjucksEnv: {
            render: jest.fn(() => '<div>test</div>'),
          },
        },
      },
    } as Partial<Request>;

    mockResponse = {
      redirect: jest.fn(),
      render: jest.fn(),
      status: jest.fn().mockReturnThis(),
      locals: {
        validatedCase: { id: '1771325608502536' },
      },
    };

    mockNext = jest.fn();

    fields = [
      {
        name: 'hadLegalAdvice',
        type: 'radio',
        required: true,
        translationKey: { label: 'question' },
        options: [
          { value: 'yes', translationKey: 'options.yes' },
          { value: 'no', translationKey: 'options.no' },
        ],
      },
    ];

    // Mock translation function
    jest
      .spyOn(require('../../../../../main/modules/i18n'), 'getTranslationFunction')
      .mockReturnValue(jest.fn((key: string) => key));

    // Mock getDashboardUrl
    (dashboardModule.getDashboardUrl as jest.Mock) = jest.fn(caseId => {
      return `/dashboard/${caseId || '1234567890123456'}`;
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Fix #3: Save for Later Functionality', () => {
    it('should validate form before saving for later', async () => {
      const { post } = createPostHandler(fields, 'free-legal-advice', 'test.njk', 'respond-to-claim');

      // Empty form + save for later
      mockRequest.body = { action: 'saveForLater' };

      await post(mockRequest as unknown as Request, mockResponse as Response, mockNext);

      // Should show validation errors (NOT redirect)
      expect(mockResponse.redirect).not.toHaveBeenCalled();
      expect(mockResponse.render).toHaveBeenCalled();
    });

    it('should save valid data and redirect to dashboard', async () => {
      const mockBeforeRedirect = jest.fn().mockResolvedValue(undefined);
      const { post } = createPostHandler(
        fields,
        'free-legal-advice',
        'test.njk',
        'respond-to-claim',
        mockBeforeRedirect
      );

      // Valid form + save for later
      mockRequest.body = {
        hadLegalAdvice: 'yes',
        action: 'saveForLater',
      };

      await post(mockRequest as unknown as Request, mockResponse as Response, mockNext);

      // Should save to session
      expect(mockRequest.session?.formData?.['free-legal-advice']).toEqual({
        hadLegalAdvice: 'yes',
      });

      // Should call beforeRedirect (save to CCD)
      expect(mockBeforeRedirect).toHaveBeenCalled();

      // Should redirect to dashboard
      expect(mockResponse.redirect).toHaveBeenCalledWith(303, '/dashboard/1771325608502536');
    });

    it('should use case ID from res.locals.validatedCase', async () => {
      const { post } = createPostHandler(fields, 'free-legal-advice', 'test.njk', 'respond-to-claim');

      mockRequest.body = {
        hadLegalAdvice: 'yes',
        action: 'saveForLater',
      };

      mockRequest.res = {
        locals: {
          validatedCase: { id: '9876543210987654' },
        },
      } as Partial<Response>;

      await post(mockRequest as unknown as Request, mockResponse as Response, mockNext);

      expect(dashboardModule.getDashboardUrl).toHaveBeenCalledWith('9876543210987654');
      expect(mockResponse.redirect).toHaveBeenCalledWith(303, '/dashboard/9876543210987654');
    });

    it('should handle missing case ID gracefully', async () => {
      const { post } = createPostHandler(fields, 'free-legal-advice', 'test.njk', 'respond-to-claim');

      mockRequest.body = {
        hadLegalAdvice: 'yes',
        action: 'saveForLater',
      };

      mockRequest.res = {
        locals: {}, // No validatedCase
      } as Partial<Response>;

      await post(mockRequest as unknown as Request, mockResponse as Response, mockNext);

      // Should still redirect (to default dashboard URL)
      expect(dashboardModule.getDashboardUrl).toHaveBeenCalledWith(undefined);
      expect(mockResponse.redirect).toHaveBeenCalledWith(303, '/dashboard/1234567890123456');
    });

    it('should save data to CCD via beforeRedirect', async () => {
      const mockBeforeRedirect = jest.fn().mockResolvedValue(undefined);
      const { post } = createPostHandler(
        fields,
        'free-legal-advice',
        'test.njk',
        'respond-to-claim',
        mockBeforeRedirect
      );

      mockRequest.body = {
        hadLegalAdvice: 'yes',
        action: 'saveForLater',
      };

      await post(mockRequest as unknown as Request, mockResponse as Response, mockNext);

      expect(mockBeforeRedirect).toHaveBeenCalledWith(mockRequest);
    });

    it('should handle beforeRedirect errors gracefully', async () => {
      const mockBeforeRedirect = jest.fn().mockRejectedValue(new Error('CCD save failed'));
      const { post } = createPostHandler(
        fields,
        'free-legal-advice',
        'test.njk',
        'respond-to-claim',
        mockBeforeRedirect
      );

      mockRequest.body = {
        hadLegalAdvice: 'yes',
        action: 'saveForLater',
      };

      await post(mockRequest as unknown as Request, mockResponse as Response, mockNext);

      // Should call next with error
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));

      // Should NOT redirect
      expect(mockResponse.redirect).not.toHaveBeenCalled();
    });
  });
});
