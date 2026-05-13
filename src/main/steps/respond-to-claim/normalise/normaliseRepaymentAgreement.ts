import { normalizeYesNoValue } from '../../utils';

import type { PossessionClaimResponse } from '@services/ccdCase.interface';

export function normaliseRepaymentAgreement(response: PossessionClaimResponse): void {
  const pa = response.defendantResponses?.paymentAgreement;
  if (!pa) {
    return;
  }

  // Plan agreed (or unsure) → instalment-payments page is skipped
  if (normalizeYesNoValue(pa.repaymentPlanAgreed) !== 'NO') {
    delete pa.repayArrearsInstalments;
    delete pa.additionalRentContribution;
    delete pa.additionalContributionFrequency;
    return;
  }

  // Instalments not offered → how-much-afford-to-pay page is skipped
  if (normalizeYesNoValue(pa.repayArrearsInstalments) !== 'YES') {
    delete pa.additionalRentContribution;
    delete pa.additionalContributionFrequency;
  }
}
