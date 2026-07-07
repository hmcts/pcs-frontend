jest.mock('@modules/steps', () => ({
  createGetController: jest.fn((_view, _step, _nav, fn) => ({
    get: async (req: Request, res?: Response) => {
      const content = await fn(req);
      if (res?.render) {
        res.render(_view, content);
      }
      return content;
    },
  })),
  createStepNavigation: jest.fn(() => ({
    getNextStepUrl: jest.fn().mockResolvedValue('/next'),
  })),
  getFormData: jest.fn(),
  getTranslationFunction: jest.fn(),
  loadStepNamespace: jest.fn(),
  setFormData: jest.fn(),
}));

jest.mock('@services/ccdCaseService', () => ({
  ccdCaseService: {
    getCaseByIdForEvent: jest.fn(),
    getCaseById: jest.fn(),
  },
}));

jest.mock('@steps', () => ({
  getFlowConfigForJourney: jest.fn(),
}));

jest.mock('@modules/nunjucks/filters/date', () => ({
  date: jest.fn((input: string) => `formatted(${input})`),
}));

jest.mock('@routes/dashboard', () => ({
  getDashboardUrl: jest.fn((caseId?: string) => (caseId ? `/dashboard/${caseId}` : undefined)),
}));

import type { Request, Response } from 'express';

import { step } from '../../../../../main/steps/case-tasks/upload-additional-documents/confirm-if-these-documents-relate-to-an-application';

import { date } from '@modules/nunjucks/filters/date';
import { createGetController, getFormData, getTranslationFunction, setFormData } from '@modules/steps';
import type { CcdCase, CcdCollectionItem, RelatedApplicationOption } from '@services/ccdCase.interface';
import { ccdCaseService } from '@services/ccdCaseService';

const mockGetCaseByIdForEvent = ccdCaseService.getCaseByIdForEvent as jest.Mock;
const mockGetCaseById = ccdCaseService.getCaseById as jest.Mock;
const mockGetFormData = getFormData as jest.Mock;
const mockGetTranslationFunction = getTranslationFunction as jest.Mock;
const mockSetFormData = setFormData as jest.Mock;

const CASE_REF = '1234567890123456';
const TOKEN = 'access-token-1';

const GEN_APP_1 = '11111111-1111-1111-1111-111111111111';
const GEN_APP_2 = '22222222-2222-2222-2222-222222222222';
const GEN_APP_NO_ID = '';

const t = (key: string, vars?: Record<string, string>) => (vars ? `${key}|${JSON.stringify(vars)}` : key);

const buildReq = (
  overrides: Partial<{ formData: Record<string, unknown>; body: Record<string, unknown> }> = {}
): Request =>
  ({
    session: { user: { accessToken: TOKEN } },
    res: { locals: { validatedCase: { id: CASE_REF } } },
    body: overrides.body ?? {},
    originalUrl: '/case/.../confirm-if-these-documents-relate-to-an-application',
  }) as unknown as Request;

const buildRes = (): Response => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res as Response);
  res.render = jest.fn().mockReturnValue(res as Response);
  res.redirect = jest.fn().mockReturnValue(res as Response);
  return res as Response;
};

const item = (
  genAppId: string,
  category: RelatedApplicationOption['category'],
  submittedDate?: string
): CcdCollectionItem<RelatedApplicationOption> => ({
  id: genAppId,
  value: { genAppId, category, submittedDate },
});

const startResponseWithOptions = (options: CcdCollectionItem<RelatedApplicationOption>[]): CcdCase => ({
  id: CASE_REF,
  data: { relatedApplicationOptions: options },
});

beforeEach(() => {
  jest.clearAllMocks();
  mockGetTranslationFunction.mockReturnValue(t);
  mockGetFormData.mockReturnValue({});
  mockGetCaseById.mockResolvedValue({
    id: CASE_REF,
    data: {
      genApps: [
        {
          id: GEN_APP_1,
          value: {
            submissionDocument: {
              id: 'doc-1',
              document: {
                document_filename: 'General Application GA1 - Defendant 1.pdf',
              },
            },
          },
        },
        {
          id: GEN_APP_2,
          value: {
            submissionDocument: {
              id: 'doc-2',
              document: {
                document_filename: 'General Application GA2 - Defendant 1.pdf',
              },
            },
          },
        },
      ],
    },
  });
  (createGetController as jest.Mock).mockImplementation((_view, _step, _nav, fn) => ({
    get: async (req: Request, res?: Response) => {
      const content = { ...(await fn(req)), t: mockGetTranslationFunction() };
      if (res?.render) {
        res.render(_view, content);
      }
      return content;
    },
  }));
  (date as jest.Mock).mockImplementation((input: string) => `formatted(${input})`);
});

describe('confirm-if-these-documents-relate-to-an-application GET', () => {
  const invokeGet = async () => {
    const getController = (
      step.getController as unknown as () => {
        get: (req: Request, res?: Response) => Promise<Record<string, unknown>>;
      }
    )();
    return getController.get(buildReq());
  };

  it('renders one option per gen-app keyed by genAppId, plus the sentinel last', async () => {
    mockGetCaseByIdForEvent.mockResolvedValue(
      startResponseWithOptions([
        item(GEN_APP_1, 'ADJOURN_HEARING_APPLICATION', '2026-05-01'),
        item(GEN_APP_2, 'GENERAL_APPLICATION', '2026-05-10'),
      ])
    );

    const result = await invokeGet();

    expect(result.applications).toEqual([
      {
        value: GEN_APP_1,
        text: 'applicationOptionAdjourn|{"date":"formatted(2026-05-01)"}',
        checked: false,
        hint: {
          html: '<a href="/case/1234567890123456/view-documents/doc-1" rel="noreferrer noopener" target="_blank" class="govuk-link">General Application GA1 - Defendant 1.pdf (opensInNewTab)</a>',
        },
      },
      {
        value: GEN_APP_2,
        text: 'applicationOptionGeneric|{"date":"formatted(2026-05-10)"}',
        checked: false,
        hint: {
          html: '<a href="/case/1234567890123456/view-documents/doc-2" rel="noreferrer noopener" target="_blank" class="govuk-link">General Application GA2 - Defendant 1.pdf (opensInNewTab)</a>',
        },
      },
      {
        value: 'MAIN_CLAIM_OR_COUNTERCLAIM',
        text: 'optionClaimOrCounterclaim',
        checked: false,
      },
    ]);
  });

  it('marks the previously selected gen-app as checked', async () => {
    mockGetFormData.mockReturnValue({ relatedApplicationId: GEN_APP_2 });
    mockGetCaseByIdForEvent.mockResolvedValue(
      startResponseWithOptions([
        item(GEN_APP_1, 'ADJOURN_HEARING_APPLICATION', '2026-05-01'),
        item(GEN_APP_2, 'GENERAL_APPLICATION', '2026-05-10'),
      ])
    );

    const result = await invokeGet();

    const apps = result.applications as { value: string; checked: boolean }[];
    expect(apps.find(a => a.value === GEN_APP_2)?.checked).toBe(true);
    expect(apps.find(a => a.value === GEN_APP_1)?.checked).toBe(false);
    expect(apps.find(a => a.value === 'MAIN_CLAIM_OR_COUNTERCLAIM')?.checked).toBe(false);
  });

  it('marks the sentinel as checked when previously selected', async () => {
    mockGetFormData.mockReturnValue({ relatedApplicationId: 'MAIN_CLAIM_OR_COUNTERCLAIM' });
    mockGetCaseByIdForEvent.mockResolvedValue(startResponseWithOptions([]));

    const result = await invokeGet();

    const apps = result.applications as { value: string; checked: boolean }[];
    expect(apps).toHaveLength(1);
    expect(apps[0]).toEqual({
      value: 'MAIN_CLAIM_OR_COUNTERCLAIM',
      text: 'optionClaimOrCounterclaim',
      checked: true,
    });
  });

  it('filters out options that have no genAppId', async () => {
    mockGetCaseByIdForEvent.mockResolvedValue(
      startResponseWithOptions([
        item(GEN_APP_NO_ID, 'ADJOURN_HEARING_APPLICATION', '2026-05-01'),
        item(GEN_APP_1, 'GENERAL_APPLICATION', '2026-05-10'),
      ])
    );

    const result = await invokeGet();

    const apps = result.applications as { value: string }[];
    expect(apps.map(a => a.value)).toEqual([GEN_APP_1, 'MAIN_CLAIM_OR_COUNTERCLAIM']);
  });
});

describe('confirm-if-these-documents-relate-to-an-application POST', () => {
  const invokePost = async (body: Record<string, unknown>) => {
    const req = buildReq({ body });
    const res = buildRes();
    const next = jest.fn();
    await step.postController!.post!(req, res, next);
    return { req, res };
  };

  it('saves the sentinel selection with category + text', async () => {
    await invokePost({ relatedApplicationId: 'MAIN_CLAIM_OR_COUNTERCLAIM' });

    expect(mockSetFormData).toHaveBeenCalledWith(
      expect.anything(),
      'confirm-if-these-documents-relate-to-an-application',
      {
        relatedApplicationId: 'MAIN_CLAIM_OR_COUNTERCLAIM',
        relatedApplicationCategory: 'MAIN_CLAIM_OR_COUNTERCLAIM',
        relatedApplicationText: 'optionClaimOrCounterclaim',
      }
    );
    expect(mockGetCaseByIdForEvent).not.toHaveBeenCalled();
  });

  it('saves a gen-app selection with the matching category + text', async () => {
    mockGetCaseByIdForEvent.mockResolvedValue(
      startResponseWithOptions([item(GEN_APP_1, 'ADJOURN_HEARING_APPLICATION', '2026-05-01')])
    );

    await invokePost({ relatedApplicationId: GEN_APP_1 });

    expect(mockSetFormData).toHaveBeenCalledWith(
      expect.anything(),
      'confirm-if-these-documents-relate-to-an-application',
      {
        relatedApplicationId: GEN_APP_1,
        relatedApplicationCategory: 'ADJOURN_HEARING_APPLICATION',
        relatedApplicationText: 'applicationOptionAdjourn|{"date":"formatted(2026-05-01)"}',
      }
    );
  });

  it('saves the id with empty text + undefined category when no option matches', async () => {
    mockGetCaseByIdForEvent.mockResolvedValue(startResponseWithOptions([]));

    await invokePost({ relatedApplicationId: 'unknown-uuid' });

    expect(mockSetFormData).toHaveBeenCalledWith(
      expect.anything(),
      'confirm-if-these-documents-relate-to-an-application',
      {
        relatedApplicationId: 'unknown-uuid',
        relatedApplicationCategory: undefined,
        relatedApplicationText: '',
      }
    );
  });

  it('renders validation error when relatedApplicationId missing', async () => {
    const req = buildReq({ body: {} });
    const res = buildRes();
    const next = jest.fn();
    await step.postController!.post!(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.render).toHaveBeenCalledWith(
      expect.stringContaining('confirmIfTheseDocumentsRelateToAnApplication'),
      expect.objectContaining({
        errorSummary: expect.objectContaining({
          titleText: 'errors.title',
        }),
        radioErrorMessage: { text: 'errors.relatedApplicationId.required' },
      })
    );
  });

  it('redirects to next step after valid selection', async () => {
    const { res } = await invokePost({ relatedApplicationId: GEN_APP_1 });
    expect(res.redirect).toHaveBeenCalledWith(303, '/next');
  });
});
