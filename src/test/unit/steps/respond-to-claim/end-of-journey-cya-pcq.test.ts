const mockPcqEntryMiddleware = jest.fn();
jest.mock('../../../../main/steps/respond-to-claim/language-used', () => ({
  pcqEntryMiddleware: mockPcqEntryMiddleware,
}));

import type { NextFunction, Request, Response } from 'express';

import { pcqWhenLanguageUsedHidden, step } from '../../../../main/steps/respond-to-claim/end-of-journey-cya';

describe('end-of-journey CYA PCQ entry', () => {
  const buildReq = (welshEnabled: boolean) => ({ res: { locals: { welshEnabled } } }) as unknown as Request;
  const res = {} as Response;

  beforeEach(() => jest.clearAllMocks());

  it('runs on the CYA page', () => {
    expect(step.middleware).toEqual([pcqWhenLanguageUsedHidden]);
  });

  it('leaves PCQ to the language step when that step is shown', () => {
    const next = jest.fn();

    pcqWhenLanguageUsedHidden(buildReq(true), res, next as NextFunction);

    expect(mockPcqEntryMiddleware).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('offers PCQ here when cui-welsh-enabled hides the language step', () => {
    const req = buildReq(false);
    const next = jest.fn();

    pcqWhenLanguageUsedHidden(req, res, next as NextFunction);

    expect(mockPcqEntryMiddleware).toHaveBeenCalledWith(req, res, next);
  });
});
