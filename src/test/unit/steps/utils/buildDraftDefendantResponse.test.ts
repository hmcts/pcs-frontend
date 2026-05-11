import type { Request } from 'express';

// Mock the normaliser
const mockNormaliseRespondToClaimDraft = jest.fn(response => response);
jest.mock('../../../../main/steps/respond-to-claim/normalise', () => ({
  normaliseRespondToClaimDraft: mockNormaliseRespondToClaimDraft,
}));

// Mock the CCD service
jest.mock('../../../../main/services/ccdCaseService', () => ({
  ccdCaseService: {
    updateDraft: jest.fn().mockResolvedValue({ id: '123', data: {} }),
  },
}));

import { ccdCaseService } from '../../../../main/services/ccdCaseService';
import { saveDraftDefendantResponse } from '../../../../main/steps/utils/buildDraftDefendantResponse';
import { ClientContextHeaders } from '../../../../types/global';

const makeReq = (): Request =>
  ({
    session: { user: { accessToken: 'tok' } },
    res: { locals: { validatedCase: { id: '123', data: {} } } },
  }) as unknown as Request;

describe('saveDraftDefendantResponse wrapper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls normaliser before sending to CCD service', async () => {
    const req = makeReq();
    const response = {
      defendantResponses: { possessionNoticeReceived: 'YES' as const },
    };

    await saveDraftDefendantResponse(req, response);

    expect(mockNormaliseRespondToClaimDraft).toHaveBeenCalledWith(response);
    expect(ccdCaseService.updateDraft).toHaveBeenCalledWith(
      { id: 'respondPossessionClaim', pageId: 'respondToPossessionDraftSavePage' },
      'tok',
      '123',
      {
        possessionClaimResponse: response, // Uses mocked normaliser return
      },
      undefined
    );
  });

  it('sends normalised response to CCD service', async () => {
    const req = makeReq();
    const originalResponse = {
      defendantResponses: { possessionNoticeReceived: 'YES' as const },
    };
    const normalisedResponse = {
      defendantResponses: { possessionNoticeReceived: 'NORMALISED' },
    };

    // Mock normaliser to return different data
    mockNormaliseRespondToClaimDraft.mockReturnValueOnce(normalisedResponse);

    await saveDraftDefendantResponse(req, originalResponse);

    expect(ccdCaseService.updateDraft).toHaveBeenCalledWith(
      { id: 'respondPossessionClaim', pageId: 'respondToPossessionDraftSavePage' },
      'tok',
      '123',
      {
        possessionClaimResponse: normalisedResponse, // Normalised version sent
      },
      undefined
    );
  });

  it('extracts accessToken and caseId from request correctly', async () => {
    const req = {
      session: { user: { accessToken: 'custom-token' } },
      res: { locals: { validatedCase: { id: 'custom-case-id', data: {} } } },
    } as unknown as Request;
    const response = { defendantResponses: {} };

    await saveDraftDefendantResponse(req, response);

    expect(ccdCaseService.updateDraft).toHaveBeenCalledWith(
      { id: 'respondPossessionClaim', pageId: 'respondToPossessionDraftSavePage' },
      'custom-token',
      'custom-case-id',
      expect.any(Object),
      undefined
    );
  });

  it('extracts calls with client context headers correctly', async () => {
    const clientContextHeaders: ClientContextHeaders = { selectedPartyId: 'abc' };

    const req = {
      session: { user: { accessToken: 'custom-token' }, clientContext: clientContextHeaders },
      res: { locals: { validatedCase: { id: 'custom-case-id', data: {} } } },
    } as unknown as Request;
    const response = { defendantResponses: {} };

    await saveDraftDefendantResponse(req, response);

    expect(ccdCaseService.updateDraft).toHaveBeenCalledWith(
      { id: 'respondPossessionClaim', pageId: 'respondToPossessionDraftSavePage' },
      'custom-token',
      'custom-case-id',
      expect.any(Object),
      clientContextHeaders
    );
  });

  it('does not mutate the caller-supplied response', async () => {
    const req = makeReq();
    const response = {
      defendantResponses: { possessionNoticeReceived: 'YES' as const },
    };
    const snapshot = JSON.stringify(response);

    await saveDraftDefendantResponse(req, response);

    expect(JSON.stringify(response)).toBe(snapshot);
  });
});
