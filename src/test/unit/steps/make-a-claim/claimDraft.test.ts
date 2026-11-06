import type { Request } from 'express';

import { CallbackRejectedError } from '../../../../main/HttpError';
import { CcdCaseModel } from '../../../../main/services/ccdCaseData.model';
import { ccdCaseService } from '../../../../main/services/ccdCaseService';
import type { CitizenPossessionClaim } from '../../../../main/services/citizenPossessionClaim.interface';
import {
  answeredClaim,
  normaliseClaim,
  restoreUnreadable,
  saveClaimDraft,
  submitClaim,
} from '../../../../main/steps/make-a-claim/claimDraft';
import { UNREADABLE } from '../../../../main/steps/make-a-claim/formValues';

jest.mock('../../../../main/services/ccdCaseService', () => ({
  ccdCaseService: {
    updateDraft: jest.fn(),
    startCaseEvent: jest.fn(),
    submitCaseEvent: jest.fn(),
    getCaseByIdForEvent: jest.fn(),
  },
}));

const service = ccdCaseService as jest.Mocked<typeof ccdCaseService>;
const CASE = '1777027600017761';

function request(): Request {
  const req = { session: { user: { accessToken: 'token' } } } as unknown as Request;
  req.res = {
    locals: {
      validatedCase: new CcdCaseModel({
        id: CASE,
        data: { propertyAddress: { AddressLine1: '1' }, citizenPossessionClaim: {} },
      }),
    },
  } as unknown as Request['res'];
  return req;
}

describe('normaliseClaim', () => {
  it('drops answers the claimant can no longer reach', () => {
    expect(
      normaliseClaim({
        claimant: {
          individualOrOrganisation: 'ORGANISATION',
          firstName: 'A',
          organisationName: 'Lets Ltd',
          contactByPhone: 'NO',
          phoneNumber: '1',
        },
        grounds: {
          hasRentArrearsGrounds: 'NO',
          rentArrearsGrounds: ['GROUND_8'],
          hasOtherGrounds: 'NO',
          otherGrounds: ['GROUND_1'],
        },
        notice: { noticeServed: 'NO', noticeType: 'OTHER', noNoticeReason: 'Abandoned' },
        rentArrears: { rentAmount: '1' },
        circumstances: { underlesseeExists: 'NO', underlesseeName: 'X' },
      })
    ).toEqual({
      claimant: { individualOrOrganisation: 'ORGANISATION', organisationName: 'Lets Ltd', contactByPhone: 'NO' },
      grounds: { hasRentArrearsGrounds: 'NO', otherGrounds: ['GROUND_1'] },
      notice: { noticeServed: 'NO', noNoticeReason: 'Abandoned' },
      circumstances: { underlesseeExists: 'NO' },
    });
  });

  it('drops details that went with answers since changed', () => {
    expect(
      normaliseClaim({
        defendants: [
          { value: { nameKnown: 'NO', firstName: 'A', addressSameAsProperty: 'YES', address: { AddressLine1: '1' } } },
        ],
        notice: { noticeServed: 'YES', noticeMethods: ['EMAIL'], emailedTo: 'a@b.test', postedDate: '2026-01-01' },
        grounds: { otherGrounds: ['GROUND_1'], otherGroundsDetails: 'x' },
        claimant: { contactByPhone: 'YES', contactByText: 'NO', textMessageNumber: '07700900000' },
      })
    ).toEqual({
      defendants: [{ value: { nameKnown: 'NO', addressSameAsProperty: 'YES' } }],
      notice: { noticeServed: 'YES', noticeMethods: ['EMAIL'], emailedTo: 'a@b.test' },
      grounds: { otherGrounds: ['GROUND_1'] },
      claimant: { contactByPhone: 'YES', contactByText: 'NO' },
    });
  });

  it('keeps the rent due day only for monthly rent', () => {
    expect(normaliseClaim({ rentArrears: { rentFrequency: 'WEEKLY', rentDueDay: 1 } }).rentArrears).toEqual({
      rentFrequency: 'WEEKLY',
    });
  });
});

describe('restoreUnreadable', () => {
  it('puts back a saved answer the page could not read, and takes every answer it could', () => {
    expect(
      restoreUnreadable(
        { rentArrears: { rentAmount: '100000', currentArrears: '5000' }, claimant: { firstName: 'Billy' } },
        { rentArrears: { rentAmount: UNREADABLE, currentArrears: '6000' }, claimant: { firstName: 'Bill' } }
      )
    ).toEqual({ rentArrears: { rentAmount: '100000', currentArrears: '6000' }, claimant: { firstName: 'Bill' } });
  });

  it('leaves an answer the claimant cleared cleared', () => {
    expect(
      restoreUnreadable({ rentArrears: { recoverySteps: 'Letters' } }, { rentArrears: { recoverySteps: undefined } })
    ).toEqual({ rentArrears: { recoverySteps: undefined } });
  });

  it('drops an unreadable answer that had nothing saved', () => {
    expect(restoreUnreadable({}, { notice: { noticeDate: UNREADABLE } })).toEqual({
      notice: { noticeDate: undefined },
    });
  });

  it('restores field by field inside the edited collection item, matched by id, by ground, or else by position', () => {
    const saved = {
      defendants: [
        { id: 'a', value: { firstName: 'Ann' } },
        { id: 'b', value: { firstName: 'Bob', lastName: 'Smith' } },
      ],
      rentArrears: { rentHistoryLedger: [{ value: { transactionDate: '2026-06-01', amountCharged: '100' } }] },
      grounds: { groundReasons: [{ value: { ground: 'GROUND_2', reason: 'Mortgage' } }] },
    };
    const updated = {
      defendants: [
        { id: 'b', value: { firstName: 'Robert', lastName: UNREADABLE } },
        { id: 'a', value: { firstName: 'Ann' } },
      ],
      rentArrears: { rentHistoryLedger: [{ value: { transactionDate: UNREADABLE, amountCharged: '200' } }] },
      grounds: {
        groundReasons: [{ value: { ground: 'GROUND_1' } }, { value: { ground: 'GROUND_2', reason: UNREADABLE } }],
      },
    };
    expect(restoreUnreadable(saved, updated)).toEqual({
      defendants: [
        { id: 'b', value: { firstName: 'Robert', lastName: 'Smith' } },
        { id: 'a', value: { firstName: 'Ann' } },
      ],
      rentArrears: { rentHistoryLedger: [{ value: { transactionDate: '2026-06-01', amountCharged: '200' } }] },
      grounds: {
        groundReasons: [{ value: { ground: 'GROUND_1' } }, { value: { ground: 'GROUND_2', reason: 'Mortgage' } }],
      },
    });
  });

  it('takes a changed list of choices whole', () => {
    expect(restoreUnreadable({ grounds: { otherGrounds: ['GROUND_1'] } }, { grounds: { otherGrounds: [] } })).toEqual({
      grounds: { otherGrounds: [] },
    });
  });
});

describe('answeredClaim', () => {
  const answered = (body: Record<string, unknown>, apply: (claim: CitizenPossessionClaim) => void) => {
    const req = request();
    req.body = body;
    req.res!.locals.validatedCase = new CcdCaseModel({
      id: CASE,
      data: { citizenPossessionClaim: { draftVersion: 4, rentArrears: { rentAmount: '100000' } } },
    });
    return answeredClaim(req, apply);
  };

  it('keeps the saved amount when the one given cannot be read', () => {
    expect(
      answered({ action: 'saveForLater' }, claim => (claim.rentArrears = { rentAmount: UNREADABLE })).rentArrears
    ).toEqual({
      rentAmount: '100000',
    });
  });

  it('takes the version the page was showing over the one the request loaded', () => {
    expect(answered({ draftVersion: '3' }, () => undefined).draftVersion).toBe(3);
    expect(answered({}, () => undefined).draftVersion).toBe(4);
  });
});

describe('saveClaimDraft', () => {
  it('saves the whole claim through the draft page and keeps the request’s case up to date', async () => {
    service.updateDraft.mockResolvedValue({
      id: CASE,
      data: { citizenPossessionClaim: { claimant: { firstName: 'Billy' } } },
    });
    const req = request();

    await saveClaimDraft(req, { claimant: { firstName: 'Billy' } });

    expect(service.updateDraft).toHaveBeenCalledWith(
      { id: 'citizenMakePossessionClaim', pageId: 'citizenMakePossessionClaimDraftSavePage' },
      'token',
      CASE,
      { citizenPossessionClaim: { claimant: { firstName: 'Billy' } } }
    );
    expect(req.res?.locals.validatedCase?.data).toEqual({
      propertyAddress: { AddressLine1: '1' },
      citizenPossessionClaim: { claimant: { firstName: 'Billy' } },
    });
  });

  it('takes a repeat of a save that already went through as done', async () => {
    service.updateDraft.mockRejectedValue(new CallbackRejectedError(['DRAFT_CHANGED'], 422));
    service.getCaseByIdForEvent.mockResolvedValue({
      id: CASE,
      data: { citizenPossessionClaim: { draftVersion: 5, defendants: [{ id: 'kept', value: { nameKnown: 'NO' } }] } },
    });
    const req = request();
    await saveClaimDraft(req, { draftVersion: 4, defendants: [{ id: 'another', value: { nameKnown: 'NO' } }] });
    expect(req.res?.locals.validatedCase?.data?.citizenPossessionClaim?.draftVersion).toBe(5);
  });

  it('refuses a save after another tab saved different answers', async () => {
    service.updateDraft.mockRejectedValue(new CallbackRejectedError(['DRAFT_CHANGED'], 422));
    service.getCaseByIdForEvent.mockResolvedValue({
      id: CASE,
      data: { citizenPossessionClaim: { draftVersion: 5, claimant: { firstName: 'Other tab' } } },
    });
    await expect(
      saveClaimDraft(request(), { draftVersion: 4, claimant: { firstName: 'This tab' } })
    ).rejects.toMatchObject({
      reasons: ['DRAFT_CHANGED'],
    });
  });

  it('normalises the claim once', async () => {
    service.updateDraft.mockResolvedValue({ id: CASE, data: {} });
    await saveClaimDraft(request(), { claimant: { individualOrOrganisation: 'ORGANISATION', firstName: 'A' } });
    expect(service.updateDraft).toHaveBeenLastCalledWith(expect.anything(), 'token', CASE, {
      citizenPossessionClaim: { claimant: { individualOrOrganisation: 'ORGANISATION' } },
    });
  });

  it('refuses to save without a case', async () => {
    const req = request();
    delete req.res!.locals.validatedCase;
    await expect(saveClaimDraft(req, {})).rejects.toThrow('Cannot save the claim');
  });
});

describe('submitClaim', () => {
  beforeEach(() => {
    service.updateDraft.mockResolvedValue({ id: CASE, data: { citizenPossessionClaim: { draftVersion: 8 } } });
    service.startCaseEvent.mockResolvedValue({ id: CASE, data: {}, eventToken: 'event-token' });
  });

  it('saves the last answers as the draft, then submits the event, which submits the saved draft', async () => {
    service.submitCaseEvent.mockResolvedValue({
      id: CASE,
      data: {},
      after_submit_callback_response: {
        confirmation_body: JSON.stringify({ serviceRequestReference: 'SR-1', feeAmount: '40400' }),
      },
    });

    await expect(
      submitClaim(request(), { draftVersion: 7, submission: { statementOfTruthAgreed: 'YES' } })
    ).resolves.toEqual({
      serviceRequestReference: 'SR-1',
      feeAmount: '40400',
    });
    expect(service.updateDraft).toHaveBeenCalledWith(expect.anything(), 'token', CASE, {
      citizenPossessionClaim: { draftVersion: 7, submission: { statementOfTruthAgreed: 'YES' } },
    });
    expect(service.updateDraft.mock.invocationCallOrder[0]).toBeLessThan(
      service.submitCaseEvent.mock.invocationCallOrder[0]
    );
    expect(service.submitCaseEvent).toHaveBeenCalledWith('token', CASE, 'citizenMakePossessionClaim', 'event-token', {
      citizenPossessionClaim: { draftVersion: 8 },
    });
  });

  it('passes on a refusal because the draft changed elsewhere', async () => {
    service.submitCaseEvent.mockRejectedValue(new CallbackRejectedError(['DRAFT_CHANGED'], 422));
    await expect(submitClaim(request(), {})).rejects.toMatchObject({ reasons: ['DRAFT_CHANGED'] });
  });

  it('reads the fee from the claim when the confirmation has none', async () => {
    service.submitCaseEvent.mockResolvedValue({
      id: CASE,
      data: { citizenPossessionClaim: { submission: { serviceRequestReference: 'SR-2', feeAmount: '40400' } } },
      after_submit_callback_response: { confirmation_body: 'not json' },
    });
    await expect(submitClaim(request(), {})).resolves.toEqual({ serviceRequestReference: 'SR-2', feeAmount: '40400' });
  });

  it('gives no fee when pcs-api asks for none', async () => {
    service.submitCaseEvent.mockResolvedValue({ id: CASE, data: {} });
    await expect(submitClaim(request(), {})).resolves.toBeUndefined();
  });

  it('refuses to submit without a signed-in user', async () => {
    const req = request();
    delete (req.session as { user?: unknown }).user;
    await expect(submitClaim(req, {})).rejects.toThrow('Cannot submit the claim');
  });
});
