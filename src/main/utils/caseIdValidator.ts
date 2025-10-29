// Hardcoded case ID for document uploads
export const CASE_ID = '1761734098857544';

// Case ID validation regex (16 digits only)
export const CASE_ID_PATTERN = /^\d{16}$/;

/**
 * Validates that a case ID matches the expected format
 * @param caseId - The case ID to validate
 * @returns true if valid, false otherwise
 */
export function validateCaseId(caseId: string): boolean {
  // Must be exactly 16 digits
  if (!CASE_ID_PATTERN.test(caseId)) {
    return false;
  }
  return true;
}

/**
 * Sanitizes a case ID by removing non-numeric characters
 * Defense in depth measure to prevent SSRF attacks
 * @param caseId - The case ID to sanitize
 * @returns Sanitized case ID containing only digits
 */
export function sanitizeCaseId(caseId: string): string {
  // Strip non-numeric characters
  return caseId.replace(/\D/g, '');
}
