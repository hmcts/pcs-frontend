import fs from 'node:fs';
import path from 'node:path';

import type { Environment } from 'nunjucks';

const translations: Record<string, string> = {
  pageTitle: 'Check your answers',
  heading: 'Check your answers',
  'statementOfTruth.heading': 'Statement of truth',
  'statementOfTruth.hint': 'Please check all the details you have entered for accuracy.',
  'statementOfTruth.contemptFieldLabel': 'Statement of truth',
  'statementOfTruth.contemptOption':
    'I understand that proceedings for contempt of court may be brought against anyone who makes, or causes to be made, a false statement in a document verified by a statement of truth without an honest belief in its truth.',
  'statementOfTruth.beliefFieldLabel': 'Statement of truth',
  'statementOfTruth.beliefOption': 'I believe that the facts stated in this defence form are true.',
  'statementOfTruth.fullNameLabel': 'Your full name',
  'errors.statementOfTruthContempt':
    'Select if you understand that proceedings for contempt of court may be brought against anyone who makes, or causes to be made, a false statement in a document verified by a statement of truth without an honest belief in its truth',
  'errors.statementOfTruthBelief': 'Select if you believe that the facts stated in this defence form are true',
  'errors.fullName': 'Enter your full name',
  'buttons.continue': 'Continue',
  'buttons.saveForLater': 'Save for later',
  'buttons.cancel': 'Cancel',
  'errors.title': 'There is a problem',
  serviceName: 'Test service',
  phase: 'ALPHA',
  feedback: 'Feedback',
  back: 'Back',
  languageToggle: 'Language toggle',
};

const t = (key: string) => translations[key] || key;

jest.mock('../../../../main/modules/steps/i18n', () => ({
  loadStepNamespace: jest.fn(),
  getStepTranslations: jest.fn(() => ({})),
  getTranslationFunction: jest.fn(() => t),
}));

jest.mock('@modules/steps', () => ({
  ...jest.requireActual('@modules/steps'),
  getTranslationFunction: jest.fn(() => t),
}));

jest.mock('../../../../main/modules/i18n', () => ({
  getRequestLanguage: jest.fn(() => 'en'),
  getCommonTranslations: jest.fn(() => ({})),
}));

jest.mock('../../../../main/modules/steps/flow', () => ({
  createStepNavigation: jest.fn(() => ({
    getBackUrl: jest.fn(async () => '/previous-step'),
    getNextStepUrl: jest.fn(async () => '/next-step'),
  })),
}));

jest.mock('../../../../main/steps/respond-to-claim/end-of-journey-cya/buildEndOfJourneyCyaRows', () => ({
  buildEndOfJourneyCyaSections: jest.fn(() => []),
}));

const mockSubmitRespondToClaimResponse = jest.fn();
jest.mock('../../../../main/steps/utils/respondToClaimFinalSubmit', () => ({
  RESPOND_TO_CLAIM_POST_SUBMIT_REDIRECT_SESSION_KEY: 'respondToClaimPostSubmitRedirect',
  getEndOfJourneyCyaSubmitErrorPath: jest.fn(
    (caseId: string) => `/case/${caseId}/respond-to-claim/end-of-journey-cya?submitError=failed`
  ),
  submitRespondToClaimResponse: (...args: unknown[]) => mockSubmitRespondToClaimResponse(...args),
}));

const mockSaveDraftDefendantResponse = jest.fn().mockResolvedValue(undefined);
jest.mock('../../../../main/steps/utils/buildDraftDefendantResponse', () => ({
  buildDraftDefendantResponse: jest.fn(() => ({
    defendantResponses: { completedSections: [] },
    defendantContactDetails: { party: {} },
  })),
  saveDraftDefendantResponse: (...args: unknown[]) => mockSaveDraftDefendantResponse(...args),
}));

import { step } from '../../../../main/steps/respond-to-claim/end-of-journey-cya';

const CASE_REF = '1234567890123456';
const nunjucksEnv = { render: jest.fn() } as unknown as Environment;

const createReq = (overrides: Record<string, unknown> = {}) =>
  ({
    body: {},
    originalUrl: `/case/${CASE_REF}/respond-to-claim/end-of-journey-cya`,
    query: { lang: 'en' },
    params: { caseReference: CASE_REF },
    session: { formData: {}, user: { accessToken: 'mock-token' } },
    app: { locals: { nunjucksEnv } },
    i18n: { loadNamespaces: jest.fn(), getResourceBundle: jest.fn(() => ({})) },
    res: { locals: { validatedCase: { id: CASE_REF, data: {} } } },
    ...overrides,
  }) as never;

describe('respond-to-claim end-of-journey-cya step', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('posts to the step URL so statement-of-truth validation runs', () => {
    const templatePath = path.join(
      __dirname,
      '../../../../main/steps/respond-to-claim/end-of-journey-cya/endOfJourneyCya.njk'
    );
    const template = fs.readFileSync(templatePath, 'utf8');

    expect(template).toContain('action="{{ url }}"');
    expect(template).not.toContain('/final-submit');
  });

  it('POST renders SOT validation errors and does not submit when fields are empty', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = { status: jest.fn().mockReturnThis(), render: jest.fn() } as any;
    const next = jest.fn();

    await step.postController!.post(createReq({ body: {} }), res, next);

    expect(mockSubmitRespondToClaimResponse).not.toHaveBeenCalled();
    expect(mockSaveDraftDefendantResponse).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.render).toHaveBeenCalledWith(
      step.view,
      expect.objectContaining({
        errorSummary: expect.objectContaining({
          errorList: expect.arrayContaining([
            expect.objectContaining({ text: translations['errors.statementOfTruthContempt'] }),
            expect.objectContaining({ text: translations['errors.statementOfTruthBelief'] }),
            expect.objectContaining({ text: translations['errors.fullName'] }),
          ]),
        }),
      })
    );
  });

  it('POST saves draft and submits when statement of truth is complete', async () => {
    mockSubmitRespondToClaimResponse.mockResolvedValue({
      confirmationPath: `/case/${CASE_REF}/respond-to-claim/response-submitted`,
    });

    const req = createReq({
      body: {
        statementOfTruthContempt: ['yes'],
        statementOfTruthBelief: ['yes'],
        fullName: 'Jane Defendant',
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = { redirect: jest.fn() } as any;

    await step.postController!.post(req, res, jest.fn());

    expect(mockSaveDraftDefendantResponse).toHaveBeenCalled();
    expect(mockSubmitRespondToClaimResponse).toHaveBeenCalledWith(req);
    expect(res.redirect).toHaveBeenCalledWith(303, `/case/${CASE_REF}/respond-to-claim/response-submitted`);
  });
});
