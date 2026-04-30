import type { Request, Response } from 'express';

jest.mock('../../../../main/modules/i18n', () => ({
  getTranslationFunction: jest.fn(() => jest.fn((key: string) => key)),
  getRequestLanguage: jest.fn(() => 'en'),
  getCommonTranslations: jest.fn(() => ({})),
  loadStepNamespace: jest.fn(),
}));

jest.mock('../../../../main/modules/steps/i18n', () => ({
  loadStepNamespace: jest.fn(),
  getStepTranslations: jest.fn(() => ({})),
  getTranslationFunction: jest.fn(() => jest.fn((key: string) => key)),
}));

jest.mock('../../../../main/modules/steps/flow', () => ({
  createStepNavigation: jest.fn(() => ({
    getBackUrl: jest.fn(async () => null),
    getNextStepUrl: jest.fn(async () => '/next-step'),
  })),
}));

jest.mock('../../../../main/modules/steps/formBuilder/helpers', () => {
  const actual = jest.requireActual('../../../../main/modules/steps/formBuilder/helpers');
  return { ...actual, validateForm: jest.fn(() => ({})) };
});

const mockBuildDraftDefendantResponse = jest.fn();
const mockSaveDraftDefendantResponse = jest.fn();
jest.mock('../../../../main/steps/utils/buildDraftDefendantResponse', () => ({
  buildDraftDefendantResponse: mockBuildDraftDefendantResponse,
  saveDraftDefendantResponse: mockSaveDraftDefendantResponse,
}));

import { step } from '../../../../main/steps/respond-to-claim/contact-preferences-email-or-post';
import { saveDraftDefendantResponse } from '../../../../main/steps/utils/buildDraftDefendantResponse';

describe('contact-preferences-email-or-post', () => {
  const makeResponse = (partyOverrides: Record<string, unknown> = {}) => ({
    defendantResponses: {} as Record<string, unknown>,
    defendantContactDetails: { party: { ...partyOverrides } as Record<string, unknown> },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createReq = (body: Record<string, unknown>): any => ({
    body,
    session: { formData: {} },
    app: { locals: { nunjucksEnv: { render: jest.fn() } } },
    res: { locals: { validatedCase: { id: '123' } } },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createRes = (): any => ({ redirect: jest.fn(), status: jest.fn().mockReturnThis(), send: jest.fn() });

  beforeEach(() => {
    jest.clearAllMocks();
    mockSaveDraftDefendantResponse.mockResolvedValue(undefined);
  });

  it('sets contactByEmail YES and contactByPost NO when only email selected', async () => {
    const response = makeResponse();
    mockBuildDraftDefendantResponse.mockReturnValue(response);

    await step.postController!.post(
      createReq({ contactByEmailOrPost: ['email'], 'contactByEmailOrPost.email': 'new@example.com' }) as Request,
      createRes() as Response,
      jest.fn()
    );

    expect(saveDraftDefendantResponse).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        defendantResponses: expect.objectContaining({ contactByEmail: 'YES', contactByPost: 'NO' }),
        defendantContactDetails: expect.objectContaining({
          party: expect.objectContaining({ emailAddress: 'new@example.com' }),
        }),
      })
    );
  });

  it('sets contactByPost YES and contactByEmail NO and clears emailAddress when only post selected', async () => {
    const response = makeResponse({ emailAddress: 'old@example.com' });
    mockBuildDraftDefendantResponse.mockReturnValue(response);

    await step.postController!.post(
      createReq({ contactByEmailOrPost: ['post'] }) as Request,
      createRes() as Response,
      jest.fn()
    );

    expect(saveDraftDefendantResponse).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        defendantResponses: expect.objectContaining({ contactByEmail: 'NO', contactByPost: 'YES' }),
      })
    );
    expect(response.defendantContactDetails.party.emailAddress).toBeUndefined();
  });

  it('sets both YES when email and post are both selected', async () => {
    const response = makeResponse();
    mockBuildDraftDefendantResponse.mockReturnValue(response);

    await step.postController!.post(
      createReq({
        contactByEmailOrPost: ['email', 'post'],
        'contactByEmailOrPost.email': 'both@example.com',
      }) as Request,
      createRes() as Response,
      jest.fn()
    );

    expect(saveDraftDefendantResponse).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        defendantResponses: expect.objectContaining({ contactByEmail: 'YES', contactByPost: 'YES' }),
        defendantContactDetails: expect.objectContaining({
          party: expect.objectContaining({ emailAddress: 'both@example.com' }),
        }),
      })
    );
  });

  it('sets both NO and clears emailAddress when nothing selected', async () => {
    const response = makeResponse({ emailAddress: 'old@example.com' });
    mockBuildDraftDefendantResponse.mockReturnValue(response);

    await step.postController!.post(createReq({}) as Request, createRes() as Response, jest.fn());

    expect(saveDraftDefendantResponse).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        defendantResponses: expect.objectContaining({ contactByEmail: 'NO', contactByPost: 'NO' }),
      })
    );
    expect(response.defendantContactDetails.party.emailAddress).toBeUndefined();
  });
});
