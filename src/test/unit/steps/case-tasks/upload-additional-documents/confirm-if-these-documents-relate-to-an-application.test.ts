jest.mock('../../../../../main/modules/steps', () => {
  const actual = jest.requireActual('../../../../../main/modules/steps');
  const getTranslationFunction = jest.fn((req: { __translations?: Record<string, string> }) => {
    const translations: Record<string, string> = req.__translations ?? {};
    return (key: string, options?: { date?: string }) => {
      const template = translations[key] ?? key;
      return template.replace('{{date}}', options?.date ?? '');
    };
  });

  return {
    ...actual,
    createGetController: jest.fn(
      (_view: string, _stepName: string, _nav: unknown, extendContent?: (req: unknown) => unknown) => ({
        get: async (req: { __translations?: Record<string, string> }, res: { render: jest.Mock }) => {
          const content = (extendContent ? await extendContent(req) : {}) as Record<string, unknown>;
          res.render(_view, {
            ...content,
            t: getTranslationFunction(req),
          });
        },
      })
    ),
    createStepNavigation: jest.fn(() => ({
      getBackUrl: jest.fn(async () => '/back'),
      getNextStepUrl: jest.fn(async () => '/next'),
    })),
    getFormData: jest.fn(() => ({ relatedApplicationId: 'gen-app-1' })),
    getTranslationFunction,
    loadStepNamespace: jest.fn(),
    setFormData: jest.fn(),
  };
});

jest.mock('@routes/dashboard', () => ({
  getDashboardUrl: jest.fn(() => '/dashboard/1234567890123456'),
}));

jest.mock('@services/ccdCaseService', () => ({
  ccdCaseService: {
    getDashboardView: jest.fn(),
    getCaseById: jest.fn(),
  },
}));

import type { Request, Response } from 'express';

import { step } from '../../../../../main/steps/case-tasks/upload-additional-documents/confirm-if-these-documents-relate-to-an-application';

import { ccdCaseService } from '@services/ccdCaseService';

const mockGetDashboardView = ccdCaseService.getDashboardView as jest.Mock;
const mockGetCaseById = ccdCaseService.getCaseById as jest.Mock;

function createReq(): Request {
  return {
    originalUrl:
      '/case/1234567890123456/upload-additional-documents/confirm-if-these-documents-relate-to-an-application',
    params: { caseReference: '1234567890123456' },
    session: {
      user: { accessToken: 'access-token-1' },
      formData: {
        relatedApplicationId: 'gen-app-1',
      },
    },
    res: {
      locals: {
        validatedCase: { id: '1234567890123456' },
      },
    },
    __translations: {
      applicationOptionAdjourn:
        'Yes, the documents I’m uploading relate to the application to adjourn the hearing - submitted on {{date}}',
      applicationOptionSetAside:
        'Yes, the documents I’m uploading relate to the application to set aside the order - submitted on {{date}}',
      applicationOptionGeneric: 'Yes, the documents I’m uploading relate to the application submitted on {{date}}',
      optionClaimOrCounterclaim: 'No, the documents I’m uploading relate to the main claim or counterclaim',
      opensInNewTab: 'opens in new tab',
    },
  } as unknown as Request;
}

function createRes(): Response {
  return {
    render: jest.fn(),
    status: jest.fn().mockReturnThis(),
  } as unknown as Response;
}

describe('confirm-if-these-documents-relate-to-an-application step', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockGetDashboardView.mockResolvedValue({
      notifications: [],
      taskGroups: [],
      propertyAddress: undefined,
      relatedApplications: [
        {
          id: 'gen-app-1',
          type: 'ADJOURN',
          applicationSubmittedDate: '2026-02-01T00:00:00.000Z',
        },
      ],
    });

    mockGetCaseById.mockResolvedValue({
      data: {
        genApps: [
          {
            id: 'gen-app-1',
            value: {
              submissionDocument: {
                id: 'doc-1',
                document: {
                  document_filename: 'General Application GA1 - Defendant 1.pdf',
                },
              },
            },
          },
        ],
      },
    });
  });

  it('adds a generated document link to the related application radio hint', async () => {
    const controller = typeof step.getController === 'function' ? step.getController() : step.getController;
    const req = createReq();
    const res = createRes();

    await controller.get(req, res);

    expect(mockGetDashboardView).toHaveBeenCalledWith('access-token-1', '1234567890123456');
    expect(mockGetCaseById).toHaveBeenCalledWith('access-token-1', '1234567890123456');
    expect(res.render).toHaveBeenCalledWith(
      step.view,
      expect.objectContaining({
        dashboardUrl: '/dashboard/1234567890123456',
        url: '/case/1234567890123456/upload-additional-documents/confirm-if-these-documents-relate-to-an-application',
        applications: [
          expect.objectContaining({
            value: 'gen-app-1',
            checked: true,
            text: expect.stringContaining(
              'Yes, the documents I’m uploading relate to the application to adjourn the hearing - submitted on'
            ),
            hint: {
              html: '<a href="/case/1234567890123456/view-documents/doc-1" rel="noreferrer noopener" target="_blank" class="govuk-link">General Application GA1 - Defendant 1.pdf (opens in new tab)</a>',
            },
          }),
          expect.objectContaining({
            value: 'claim-or-counterclaim',
            text: 'No, the documents I’m uploading relate to the main claim or counterclaim',
          }),
        ],
      })
    );
  });
});
