jest.mock('../../../../main/modules/steps', () => ({
  createFormStep: jest.fn(config => config),
  getTranslationFunction: jest.fn(),
}));

const mockRedirectToPcq = jest.fn();
jest.mock('@services/pcq/redirectToPcq', () => ({
  redirectToPcq: mockRedirectToPcq,
}));

const mockBuildDraft = jest.fn();
const mockSaveDraft = jest.fn();
jest.mock('../../../../main/steps/utils/buildDraftDefendantResponse', () => ({
  buildDraftDefendantResponse: mockBuildDraft,
  saveDraftDefendantResponse: mockSaveDraft,
}));

import type { NextFunction, Request, Response } from 'express';

import {
  languageUsedEnabledMiddleware,
  pcqEntryMiddleware,
  step,
} from '../../../../main/steps/respond-to-claim/language-used';

// PCQ (the equality questionnaire) is offered on entry to language-used — the first step of "Check
// your answers and submit"
const runMiddleware = pcqEntryMiddleware as unknown as (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void>;

describe('language-used pcqEntryMiddleware (PCQ fires before the language screen)', () => {
  const buildReq = (): Request => ({ res: { locals: { validatedCase: { id: '123' } } } }) as unknown as Request;
  const res = {} as Response;

  beforeEach(() => jest.clearAllMocks());

  it('hands the citizen to PCQ and does not render the language screen when a redirect is issued', async () => {
    mockRedirectToPcq.mockResolvedValue(true);
    const req = buildReq();
    const next = jest.fn();

    await runMiddleware(req, res, next as unknown as NextFunction);

    expect(mockRedirectToPcq).toHaveBeenCalledWith(req);
    expect(next).not.toHaveBeenCalled();
  });

  it('continues to the language screen when PCQ is disabled, unavailable, or already answered', async () => {
    mockRedirectToPcq.mockResolvedValue(false);
    const req = buildReq();
    const next = jest.fn();

    await runMiddleware(req, res, next as unknown as NextFunction);

    expect(mockRedirectToPcq).toHaveBeenCalledWith(req);
    expect(next).toHaveBeenCalledTimes(1);
  });
});

// createFormStep is mocked to return its config, so the step carries beforeRedirect.
const beforeRedirect = (step as unknown as { beforeRedirect: (req: Request) => Promise<void> }).beforeRedirect;

describe('language-used when welsh-language-used-enabled is switched', () => {
  const buildReq = (welshLanguageUsedEnabled: boolean, body: Record<string, unknown> = {}): Request =>
    ({
      body,
      res: { locals: { welshLanguageUsedEnabled, validatedCase: { id: '1234567812345678' } } },
    }) as unknown as Request;

  beforeEach(() => {
    jest.clearAllMocks();
    mockBuildDraft.mockReturnValue({ defendantResponses: {} });
  });

  it('checks the flag before offering PCQ', () => {
    expect(step.middleware).toEqual([languageUsedEnabledMiddleware, pcqEntryMiddleware]);
  });

  it('shows the language screen when the flag is on', () => {
    const next = jest.fn();
    const res = { redirect: jest.fn() } as unknown as Response;

    languageUsedEnabledMiddleware(buildReq(true), res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.redirect).not.toHaveBeenCalled();
  });

  it('sends a direct visit on to the end-of-journey CYA when the flag is off', () => {
    const next = jest.fn();
    const res = { redirect: jest.fn() } as unknown as Response;

    languageUsedEnabledMiddleware(buildReq(false), res, next);

    expect(res.redirect).toHaveBeenCalledWith(303, '/case/1234567812345678/respond-to-claim/end-of-journey-cya?nav=1');
    expect(next).not.toHaveBeenCalled();
  });

  it('saves the chosen language when the flag is on', async () => {
    await beforeRedirect(buildReq(true, { languageUsed: 'WELSH' }));

    expect(mockSaveDraft).toHaveBeenCalledWith(expect.anything(), { defendantResponses: { languageUsed: 'WELSH' } });
  });

  it('ignores a posted language when the flag is off', async () => {
    await beforeRedirect(buildReq(false, { languageUsed: 'WELSH' }));

    expect(mockSaveDraft).toHaveBeenCalledWith(expect.anything(), { defendantResponses: {} });
  });
});
