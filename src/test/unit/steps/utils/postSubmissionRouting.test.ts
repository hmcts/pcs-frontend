import {
  getRespondToClaimConfirmationPath,
  getRespondToClaimSubmitNavigation,
} from '../../../../main/steps/utils/postSubmissionRouting';

import type { CcdCaseData } from '@services/ccdCase.interface';

const caseId = '1234567890123456';
const journeyBase = `/case/${caseId}/respond-to-claim`;

describe('postSubmissionRouting', () => {
  describe('getRespondToClaimConfirmationPath', () => {
    it('returns response-submitted when there is no counterclaim', () => {
      expect(getRespondToClaimConfirmationPath(caseId, undefined)).toBe(`${journeyBase}/response-submitted`);
      expect(
        getRespondToClaimConfirmationPath(caseId, {
          possessionClaimResponse: { defendantResponses: { makeCounterClaim: 'NO' } },
        } as CcdCaseData)
      ).toBe(`${journeyBase}/response-submitted`);
    });

    it('returns response-and-counter-claim-submitted when counterclaim has HwF reference', () => {
      expect(
        getRespondToClaimConfirmationPath(caseId, {
          possessionClaimResponse: {
            defendantResponses: {
              makeCounterClaim: 'YES',
              counterClaim: { hwfReferenceNumber: '  HWF-1  ' },
            },
          },
        } as CcdCaseData)
      ).toBe(`${journeyBase}/response-and-counter-claim-submitted`);
    });

    it('returns fee payment needed when counterclaim has no HwF reference', () => {
      expect(
        getRespondToClaimConfirmationPath(caseId, {
          possessionClaimResponse: {
            defendantResponses: {
              makeCounterClaim: 'YES',
              counterClaim: { hwfReferenceNumber: ' ' },
            },
          },
        } as CcdCaseData)
      ).toBe(`${journeyBase}/response-submitted-counter-claim-fee-payment-needed`);
    });
  });

  describe('getRespondToClaimSubmitNavigation', () => {
    it('marks payment required when submit payload includes a service request reference', () => {
      const navigation = getRespondToClaimSubmitNavigation(caseId, undefined, {
        serviceRequestReference: 'SR-123',
        feeAmount: 404,
      });

      expect(navigation).toEqual({
        confirmationPath: `${journeyBase}/response-submitted-counter-claim-fee-payment-needed`,
        counterClaimFeePaymentRequired: true,
      });
    });

    it('does not mark payment required when no submit payment payload is present', () => {
      const navigation = getRespondToClaimSubmitNavigation(caseId, {
        possessionClaimResponse: {
          defendantResponses: {
            makeCounterClaim: 'YES',
            counterClaim: { hwfReferenceNumber: ' ' },
          },
        },
      } as CcdCaseData);

      expect(navigation.counterClaimFeePaymentRequired).toBe(false);
      expect(navigation.confirmationPath).toBe(`${journeyBase}/response-submitted-counter-claim-fee-payment-needed`);
    });
  });
});
