export const counterClaimApplicationFeeAmount = {
  mainHeader: `Counterclaim application fee amount`,
  counterClaimAmountLabel: `Counterclaim amount`,
  counterClaimFeeLabel: `Counterclaim fee`,
  paymentHint: `You must pay your counterclaim fee for your counterclaim to be considered.`,
  getPayButton: (fee: string): string => `Pay your counterclaim fee (£${fee})`,
};
