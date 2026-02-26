/**
 * valid case reference must be exactly 16 digits.
 * @param caseReference - The case reference to validate (string or number)
 * @returns sanitised case reference as a string, or null if invalid
 */
export function sanitiseCaseReference(caseReference: string | number): string | null {
  const caseRefStr = String(caseReference);
  return /^\d{16}$/.test(caseRefStr) ? caseRefStr : null;
}

export const DEFAULT_CASE_REFERENCE = '1234567890123456'; // TODO: remove hardcoded fake CCD caseId when CCD backend is setup

/**
 * Converts unknown input to a valid 16-digit case reference string.
 * If the input is not a valid 16-digit case reference, returns a default case reference.
 * This is useful for sanitizing session data before URL construction.
 *
 * @param value - The value to convert (can be any type)
 * @returns A valid 16-digit case reference string
 *
 * @example
 * toCaseReference16('1234567890123456') // '1234567890123456'
 * toCaseReference16(null) // '1234567890123456' (default)
 * toCaseReference16('invalid') // '1234567890123456' (default)
 */
export function toCaseReference16(value: unknown): string {
  const strValue = String(value ?? '').trim();
  return /^\d{16}$/.test(strValue) ? strValue : DEFAULT_CASE_REFERENCE;
}
