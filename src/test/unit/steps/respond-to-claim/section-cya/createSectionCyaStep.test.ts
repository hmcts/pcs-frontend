import type { NextFunction, Request, Response } from 'express';

const mockBuildDraft = jest.fn();
const mockSaveDraft = jest.fn();

jest.mock('../../../../../main/steps/utils/buildDraftDefendantResponse', () => ({
  buildDraftDefendantResponse: (req: Request) => mockBuildDraft(req),
  saveDraftDefendantResponse: (req: Request, draft: unknown) => mockSaveDraft(req, draft),
}));

jest.mock('@steps', () => ({
  getFlowConfigForJourney: () => undefined,
}));

import { createSectionCyaStep } from '../../../../../main/steps/respond-to-claim/section-cya/createSectionCyaStep';

const makeReq = (action: string | undefined): Request =>
  ({
    body: action === undefined ? {} : { action },
    res: { locals: { validatedCase: { id: '1777294706554860' } } },
  }) as unknown as Request;

const makeRes = (): Response => {
  const res = {} as Response;
  res.redirect = jest.fn() as unknown as Response['redirect'];
  res.status = jest.fn(() => res) as unknown as Response['status'];
  res.render = jest.fn() as unknown as Response['render'];
  return res;
};

const callPost = async (action: string | undefined, draftToReturn: object) => {
  mockBuildDraft.mockReturnValue(draftToReturn);
  mockSaveDraft.mockResolvedValue(undefined);

  const step = createSectionCyaStep({
    stepName: 'check-your-answers-personal-details',
    cardTitleKey: 'taskList.personalDetails',
    stepDir: __dirname,
    buildRows: () => [],
  });

  const req = makeReq(action);
  const res = makeRes();
  const next = jest.fn() as NextFunction;
  await step.postController!.post(req, res, next);
  return { req, res, next };
};

describe('createSectionCyaStep postController — completedSections producer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('appends the section enum to completedSections on Save & continue', async () => {
    const draft = { defendantResponses: { completedSections: [] } };
    await callPost(undefined, draft);

    expect(mockSaveDraft).toHaveBeenCalledTimes(1);
    expect(draft.defendantResponses.completedSections).toEqual(['PERSONAL_DETAILS']);
  });

  it('is idempotent — Save & continue twice does not duplicate the section enum', async () => {
    const draft = { defendantResponses: { completedSections: ['PERSONAL_DETAILS'] } };
    await callPost(undefined, draft);

    expect(draft.defendantResponses.completedSections).toEqual(['PERSONAL_DETAILS']);
  });

  it('removes the section enum on Save for later', async () => {
    const draft = {
      defendantResponses: { completedSections: ['PERSONAL_DETAILS', 'PAYMENTS'] },
    };
    await callPost('saveForLater', draft);

    expect(mockSaveDraft).toHaveBeenCalledTimes(1);
    expect(draft.defendantResponses.completedSections).toEqual(['PAYMENTS']);
  });

  it('redirects to the task-list hub on Save and continue (citizen)', async () => {
    const draft = { defendantResponses: { completedSections: [] } };
    const { res } = await callPost(undefined, draft);
    expect(res.redirect).toHaveBeenCalledWith(303, '/case/1777294706554860/respond-to-claim/task-list');
  });

  it('redirects to the task-list hub on Save for later (citizen) — not the dashboard', async () => {
    const draft = { defendantResponses: { completedSections: ['PERSONAL_DETAILS'] } };
    const { res } = await callPost('saveForLater', draft);
    expect(res.redirect).toHaveBeenCalledWith(303, '/case/1777294706554860/respond-to-claim/task-list');
  });

  it('routes errors via next() when the draft save fails', async () => {
    const draft = { defendantResponses: {} };
    mockBuildDraft.mockReturnValue(draft);
    mockSaveDraft.mockRejectedValue(new Error('BE 500'));

    const step = createSectionCyaStep({
      stepName: 'check-your-answers-personal-details',
      cardTitleKey: 'taskList.personalDetails',
      stepDir: __dirname,
      buildRows: () => [],
    });

    const req = makeReq(undefined);
    const res = makeRes();
    const next = jest.fn() as NextFunction;
    await step.postController!.post(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'BE 500' }));
    expect(res.redirect).not.toHaveBeenCalled();
  });
});
