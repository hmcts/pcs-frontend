/**
 * Utility functions for object manipulation
 */

/**
 * Checks if a value is non-empty (not undefined, null, or empty string)
 */
export function isNonEmpty(value: unknown): boolean {
  return value !== undefined && value !== null && value !== '';
}

/**
 * Filters an object to only include entries with non-empty values
 */
export function filterNonEmptyValues<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, value]) => isNonEmpty(value))) as Partial<T>;
}
