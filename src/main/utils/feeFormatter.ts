export function formatFee(fee: number): string {
  const decimalString = fee.toFixed(2);

  if (decimalString.endsWith('.00')) {
    return fee.toFixed(0);
  } else {
    return decimalString;
  }
}
