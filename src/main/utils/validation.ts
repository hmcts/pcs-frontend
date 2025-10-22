/**
 * Validation utilities for security-sensitive inputs
 */

/**
 * Validates case reference format
 * Case references must be 16-digit numeric strings
 *
 * @param caseRef - The case reference to validate
 * @returns true if valid, false otherwise
 */
export function validateCaseReference(caseRef: string): boolean {
  if (!caseRef || typeof caseRef !== 'string') {
    return false;
  }

  // Must be exactly 16 digits
  return /^\d{16}$/.test(caseRef);
}

/**
 * Sanitizes and encodes case reference for safe URL usage
 * Prevents URL injection and path traversal attacks
 *
 * @param caseRef - The case reference to sanitize
 * @returns URL-encoded case reference
 */
export function sanitizeCaseReference(caseRef: string): string {
  return encodeURIComponent(caseRef);
}
