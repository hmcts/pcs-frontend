export function caseNumberFormatter(value: string | number): string {
  return value.toString().replace(/(\d{4})(?=\d)/g, '$1-');
}
