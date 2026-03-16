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

/**
 * Transforms a flat dot-path into a nested object structure.
 *
 * This is useful for CCD API payloads which expect nested JSON, but our code
 * references fields using dot-notation paths like "parent.child.field".
 *
 * @param path - Dot-separated path string (e.g., 'level1.level2.level3')
 * @param value - The data object to place at the deepest level
 * @returns A nested object with the value at the specified path
 *
 * @example
 * // Simple example
 * pathToNested('a.b.c', { x: 1 })
 * // Returns: { a: { b: { c: { x: 1 } } } }
 *
 * @example
 * // Real CCD usage - saving defendant's name to nested CCD structure
 * pathToNested('possessionClaimResponse.party', { firstName: 'John', lastName: 'Doe' })
 * // Returns: {
 * //   possessionClaimResponse: {
 * //     party: {
 * //       firstName: 'John',
 * //       lastName: 'Doe'
 * //     }
 * //   }
 * // }
 */
export function pathToNested(path: string, value: Record<string, unknown>): Record<string, unknown> {
  // Split the path into individual keys: 'a.b.c' becomes ['a', 'b', 'c']
  const keys = path.split('.');

  // This will hold our final nested object
  const result: Record<string, unknown> = {};

  // Build the nested structure by walking through each key
  keys.reduce((currentLevel, key, index) => {
    const isLastKey = index === keys.length - 1;

    if (isLastKey) {
      // At the deepest level, assign the actual value
      currentLevel[key] = value;
    } else {
      // For intermediate levels, create an empty object to nest into
      currentLevel[key] = {};
    }

    // Move one level deeper for the next iteration
    return currentLevel[key] as Record<string, unknown>;
  }, result);

  return result;
}
