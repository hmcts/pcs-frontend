import { formatPoundsValue } from '../../utils/common/string.utils';

export const counterClaimApplicationFeeAmount = {
  mainHeader: `Pay your counterclaim fee`,
  counterClaimAmountLabel: `Counterclaim amount`,
  counterClaimFeeLabel: `Counterclaim fee`,
  paymentHint: `You must pay your counterclaim fee for your counterclaim to be considered.`,
  getPayButton: (fee: string): string => `Pay your counterclaim fee (${formatPoundsValue(fee)})`,
};
