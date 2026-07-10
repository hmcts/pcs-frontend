import type { NextFunction, Request, Response } from 'express';

import * as flowModule from '@modules/steps/flow';
import type { FormFieldConfig } from '@modules/steps/formBuilder/formFieldConfig.interface';
import { buildManageCaseDetailsRedirect, createPostHandler } from '@modules/steps/formBuilder/postHandler';
import type { JourneyFlowConfig } from '@modules/steps/stepFlow.interface';
import * as dashboardModule from '@routes/dashboard';
import { CcdCaseModel } from '@services/ccdCaseData.model';

jest.mock('@routes/dashboard');
jest.mock('@modules/i18n');
jest.mock('@modules/steps/flow');

const flowConfig: JourneyFlowConfig = {
  stepOrder: [],
  steps: {},
};

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
    } as unknown as Request;

    mockResponse = {
      redirect: jest.fn(),
      render: jest.fn(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
      locals: {
        validatedCase: new CcdCaseModel({ id: '1771325608502536', data: {} }),
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
      return `/case/${caseId || '1234567890123456'}/dashboard`;
    });

    (flowModule.createStepNavigation as jest.Mock).mockReturnValue({
      getBackUrl: jest.fn().mockResolvedValue('/previous-step'),
      getNextStepUrl: jest.fn().mockResolvedValue('/next-step'),
    });
    (flowModule.getStepUrl as jest.Mock).mockReturnValue('/case/1771325608502536/respond-to-claim/task-list');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Fix #3: Save for Later Functionality', () => {
    describe('buildManageCaseDetailsRedirect', () => {
      it('builds a validated Manage Case case-details URL', () => {
        expect(
          buildManageCaseDetailsRedirect(
            'https://manage-case.aat.platform.hmcts.net/cases/case-details/PCS/PCS/',
            '1771325608502536'
          )
        ).toBe('https://manage-case.aat.platform.hmcts.net/cases/case-details/PCS/PCS/1771325608502536');
      });

      it.each([
        [null, '1771325608502536'],
        ['https://manage-case.aat.platform.hmcts.net/cases/case-details/PCS/PCS', undefined],
        ['https://manage-case.aat.platform.hmcts.net/cases/case-details/PCS/PCS', 'https://example.com'],
        ['javascript:alert(1)', '1771325608502536'],
        ['https://manage-case.aat.platform.hmcts.net/redirect', '1771325608502536'],
        ['not a url', '1771325608502536'],
      ])('rejects unsafe Manage Case redirect inputs', (baseUrl, caseId) => {
        expect(buildManageCaseDetailsRedirect(baseUrl, caseId)).toBeUndefined();
      });
    });

    it('passes current step post payload to navigation for forward routing', async () => {
      const getNextStepUrl = jest.fn().mockResolvedValue('/case/1771325608502536/respond-to-claim/contact-preferences');
      (flowModule.createStepNavigation as jest.Mock).mockReturnValue({
        getBackUrl: jest.fn().mockResolvedValue('/previous-step'),
        getNextStepUrl,
      });

      const testFlowConfig: JourneyFlowConfig = {
        journeyName: 'respondToClaim',
        basePath: '/case/:caseReference/respond-to-claim',
        stepOrder: ['free-legal-advice', 'contact-preferences'],
        steps: {
          'free-legal-advice': {
            defaultNext: 'contact-preferences',
          },
        },
      };

      const { post } = createPostHandler(fields, 'free-legal-advice', 'test.njk', 'respondToClaim', testFlowConfig);

      mockRequest.body = {
        hadLegalAdvice: 'yes',
      };

      await post(mockRequest as unknown as Request, mockResponse as Response, mockNext);

      expect(getNextStepUrl).toHaveBeenCalledWith(
        mockRequest,
        'free-legal-advice',
        expect.objectContaining({ hadLegalAdvice: 'yes' })
      );
      expect(mockResponse.redirect).toHaveBeenCalledWith(
        303,
        '/case/1771325608502536/respond-to-claim/contact-preferences'
      );
    });

    it('resolves navigation flow config from the supplied resolver', async () => {
      const resolvedFlowConfig: JourneyFlowConfig = {
        journeyName: 'respondToClaim',
        stepOrder: ['free-legal-advice', 'legalrep-next'],
        steps: {
          'free-legal-advice': { defaultNext: 'legalrep-next' },
        },
      };

      createPostHandler(fields, 'free-legal-advice', 'test.njk', 'respondToClaim', () => resolvedFlowConfig);

      const createStepNavigationCalls = (flowModule.createStepNavigation as jest.Mock).mock.calls;
      const flowConfigResolver = createStepNavigationCalls[createStepNavigationCalls.length - 1][0] as (
        req: Request
      ) => Promise<JourneyFlowConfig>;

      await expect(flowConfigResolver(mockRequest as Request)).resolves.toBe(resolvedFlowConfig);
    });

    it('uses request-resolved flow config for session form data persistence', async () => {
      const { post } = createPostHandler(fields, 'free-legal-advice', 'test.njk', 'respondToClaim', () => ({
        ...flowConfig,
        useSessionFormData: false,
      }));

      mockRequest.body = {
        hadLegalAdvice: 'yes',
      };
      mockRequest.res = {
        locals: {
          validatedCase: { id: '1771325608502536' },
        },
      } as unknown as Response;

      await post(mockRequest as unknown as Request, mockResponse as Response, mockNext);

      expect(
        (mockRequest.session as { formData?: Record<string, unknown> } | undefined)?.formData?.['free-legal-advice']
      ).toBeUndefined();
      expect(mockResponse.redirect).toHaveBeenCalledWith(303, '/next-step');
    });

    it('bypasses validation on saveForLater and redirects', async () => {
      const { post } = createPostHandler(fields, 'free-legal-advice', 'test.njk', 'respondToClaim', flowConfig);
      mockRequest.body = { action: 'saveForLater' };

      await post(mockRequest as unknown as Request, mockResponse as Response, mockNext);

      expect(mockResponse.render).not.toHaveBeenCalled();
      expect(mockResponse.redirect).toHaveBeenCalled();
    });

    it('redirects save for later to the configured hub step when present', async () => {
      const hubFlowConfig: JourneyFlowConfig = {
        ...flowConfig,
        hubStepName: 'task-list',
      };
      const { post } = createPostHandler(fields, 'free-legal-advice', 'test.njk', 'respondToClaim', hubFlowConfig);
      mockRequest.body = { action: 'saveForLater' };

      await post(mockRequest as unknown as Request, mockResponse as Response, mockNext);

      expect(flowModule.getStepUrl).toHaveBeenCalledWith('task-list', hubFlowConfig, '1771325608502536');
      expect(mockResponse.redirect).toHaveBeenCalledWith(
        303,
        '/case/1771325608502536/respond-to-claim/task-list'
      );
    });

    it('should save valid data and redirect to dashboard', async () => {
      const mockBeforeRedirect = jest.fn().mockResolvedValue(undefined);
      const { post } = createPostHandler(
        fields,
        'free-legal-advice',
        'test.njk',
        'respondToClaim',
        flowConfig,
        mockBeforeRedirect
      );

      // Valid form + save for later
      mockRequest.body = {
        hadLegalAdvice: 'yes',
        action: 'saveForLater',
      };

      await post(mockRequest as unknown as Request, mockResponse as Response, mockNext);

      // Should save to session
      expect(
        (mockRequest.session as { formData?: Record<string, unknown> } | undefined)?.formData?.['free-legal-advice']
      ).toEqual({
        hadLegalAdvice: 'yes',
      });

      // Should call beforeRedirect (save to CCD)
      expect(mockBeforeRedirect).toHaveBeenCalled();

      // Should redirect to dashboard
      expect(mockResponse.redirect).toHaveBeenCalledWith(303, '/case/1771325608502536/dashboard');
    });

    it('redirects legal representative users to a validated Manage Case URL on save for later', async () => {
      const { post } = createPostHandler(fields, 'free-legal-advice', 'test.njk', 'respondToClaim', flowConfig);

      mockRequest.session = {
        ...mockRequest.session,
        user: {
          ...mockRequest.session?.user,
          roles: ['caseworker-pcs-solicitor'],
        },
      } as unknown as Request['session'];
      mockRequest.body = {
        hadLegalAdvice: 'yes',
        action: 'saveForLater',
      };

      await post(mockRequest as unknown as Request, mockResponse as Response, mockNext);

      expect(mockResponse.redirect).toHaveBeenCalledWith(
        303,
        'https://manage-case.aat.platform.hmcts.net/cases/case-details/PCS/PCS/1771325608502536'
      );
    });

    it('does not use an invalid case ID in the legal representative Manage Case redirect', async () => {
      const { post } = createPostHandler(fields, 'free-legal-advice', 'test.njk', 'respondToClaim', flowConfig);

      mockRequest.session = {
        ...mockRequest.session,
        user: {
          ...mockRequest.session?.user,
          roles: ['caseworker-pcs-solicitor'],
        },
      } as unknown as Request['session'];
      mockRequest.res = {
        locals: {
          validatedCase: { id: 'https://example.com' },
        },
      } as unknown as Response;
      (dashboardModule.getDashboardUrl as jest.Mock).mockReturnValue('/');
      mockRequest.body = {
        hadLegalAdvice: 'yes',
        action: 'saveForLater',
      };

      await post(mockRequest as unknown as Request, mockResponse as Response, mockNext);

      expect(mockResponse.redirect).toHaveBeenCalledWith(303, '/');
    });

    it('should use case ID from res.locals.validatedCase', async () => {
      const { post } = createPostHandler(fields, 'free-legal-advice', 'test.njk', 'respondToClaim', flowConfig);

      mockRequest.body = {
        hadLegalAdvice: 'yes',
        action: 'saveForLater',
      };

      mockRequest.res = {
        locals: {
          validatedCase: { id: '9876543210987654' },
        },
      } as unknown as Response;

      await post(mockRequest as unknown as Request, mockResponse as Response, mockNext);

      expect(dashboardModule.getDashboardUrl).toHaveBeenCalledWith('9876543210987654');
      expect(mockResponse.redirect).toHaveBeenCalledWith(303, '/case/9876543210987654/dashboard');
    });

    it('should handle missing case ID gracefully', async () => {
      const { post } = createPostHandler(fields, 'free-legal-advice', 'test.njk', 'respondToClaim', flowConfig);

      mockRequest.body = {
        hadLegalAdvice: 'yes',
        action: 'saveForLater',
      };

      mockRequest.res = {
        locals: {}, // No validatedCase
      } as unknown as Response;

      await post(mockRequest as unknown as Request, mockResponse as Response, mockNext);

      // Should redirect to home when no valid case ID
      expect(mockResponse.redirect).toHaveBeenCalledWith(303, '/');
    });

    it('should save data to CCD via beforeRedirect', async () => {
      const mockBeforeRedirect = jest.fn().mockResolvedValue(undefined);
      const { post } = createPostHandler(
        fields,
        'free-legal-advice',
        'test.njk',
        'respondToClaim',
        flowConfig,
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
        'respondToClaim',
        flowConfig,
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

    it('stops processing when beforeRedirect has already sent a response', async () => {
      const mockBeforeRedirect = jest.fn().mockImplementation((_req: Request) => {
        Object.defineProperty(mockResponse, 'headersSent', {
          configurable: true,
          value: true,
        });
      });
      const { post } = createPostHandler(
        fields,
        'free-legal-advice',
        'test.njk',
        'respondToClaim',
        flowConfig,
        mockBeforeRedirect
      );

      mockRequest.body = {
        hadLegalAdvice: 'yes',
      };

      await post(mockRequest as unknown as Request, mockResponse as Response, mockNext);

      expect(mockBeforeRedirect).toHaveBeenCalledWith(mockRequest);
      expect(mockResponse.redirect).not.toHaveBeenCalled();
    });

    it('uses a custom redirect path after post when provided', async () => {
      const resolveRedirectAfterPost = jest.fn().mockResolvedValue('/case/1771325608502536/custom-next');
      const { post } = createPostHandler(
        fields,
        'free-legal-advice',
        'test.njk',
        'respondToClaim',
        flowConfig,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        resolveRedirectAfterPost
      );

      mockRequest.body = {
        hadLegalAdvice: 'yes',
      };

      await post(mockRequest as unknown as Request, mockResponse as Response, mockNext);

      expect(resolveRedirectAfterPost).toHaveBeenCalledWith(mockRequest);
      expect(mockResponse.redirect).toHaveBeenCalledWith(303, '/case/1771325608502536/custom-next');
    });

    it('falls back to step navigation when custom redirect resolver returns no path', async () => {
      const resolveRedirectAfterPost = jest.fn().mockResolvedValue(undefined);
      const { post } = createPostHandler(
        fields,
        'free-legal-advice',
        'test.njk',
        'respondToClaim',
        flowConfig,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        resolveRedirectAfterPost
      );

      mockRequest.body = {
        hadLegalAdvice: 'yes',
      };

      await post(mockRequest as unknown as Request, mockResponse as Response, mockNext);

      expect(resolveRedirectAfterPost).toHaveBeenCalledWith(mockRequest);
      expect(mockResponse.redirect).toHaveBeenCalledWith(303, '/next-step');
    });

    it('returns a 500 response when navigation cannot determine the next step', async () => {
      (flowModule.createStepNavigation as jest.Mock).mockReturnValue({
        getBackUrl: jest.fn().mockResolvedValue('/previous-step'),
        getNextStepUrl: jest.fn().mockResolvedValue(undefined),
      });
      const { post } = createPostHandler(fields, 'free-legal-advice', 'test.njk', 'respondToClaim', flowConfig);

      mockRequest.body = {
        hadLegalAdvice: 'yes',
      };

      await post(mockRequest as unknown as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.send).toHaveBeenCalledWith('Unable to determine next step');
    });
  });
});
