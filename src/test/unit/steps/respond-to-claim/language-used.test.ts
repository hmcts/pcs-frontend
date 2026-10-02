jest.mock('../../../../main/modules/steps', () => ({
  createFormStep: jest.fn(config => config),
  getTranslationFunction: jest.fn(),
}));

const mockRedirectToPcq = jest.fn();
jest.mock('@services/pcq/redirectToPcq', () => ({
  redirectToPcq: mockRedirectToPcq,
}));

import type { NextFunction, Request, Response } from 'express';

import { pcqEntryMiddleware } from '../../../../main/steps/respond-to-claim/language-used';

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
