import { formatPoundsValue } from '../../utils/common/string.utils';

export const counterClaimApplicationFeeAmount = {
  mainHeader: `Pay your counterclaim fee`,
  counterClaimAmountLabel: `Counterclaim amount`,
  counterClaimAmountNotApplicable: `Not applicable`,
  counterClaimFeeLabel: `Counterclaim fee`,
  somethingElseCounterClaimFee: `377.00`,
  paymentHint: `You must pay your counterclaim fee for your counterclaim to be considered.`,
  getPayButton: (fee: string): string => `Pay your counterclaim fee (${formatPoundsValue(fee)})`,
  paymentFailedDynamicErrorMessage: `We could not start your payment. Try again.`,
};
