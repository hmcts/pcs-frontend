/**
 * valid case reference must be exactly 16 digits.
 * @param caseReference - The case reference to validate (string or number)
 * @returns sanitised case reference as a string, or null if invalid
 */
export function sanitiseCaseReference(caseReference: string | number): string | null {
  const caseRefStr = String(caseReference);
  return /^\d{16}$/.test(caseRefStr) ? caseRefStr : null;
}
