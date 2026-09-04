import { formatPoundsValue } from '../../utils/common/string.utils';

export const counterClaimApplicationFeeAmount = {
  mainHeader: `Talu eich ffi gwrth-hawliad`,
  counterClaimAmountLabel: `Counterclaim amount`,
  counterClaimAmountNotApplicable: `Not applicable`,
  counterClaimFeeLabel: `Ffi gwrth-hawliad`,
  somethingElseCounterClaimFee: `387.00`,
  paymentHint: `You must pay your counterclaim fee for your counterclaim to be considered.`,
  getPayButton: (fee: string): string => `Talu eich ffi gwrth-hawliad (${formatPoundsValue(fee)})`,
  paymentFailedDynamicErrorMessage: `We could not start your payment. Try again.`,
};
