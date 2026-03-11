import type { TFunction } from 'i18next';

/**
 * Creates a mock TFunction for testing that properly supports returnObjects option.
 *
 * This factory eliminates the need to duplicate mock logic across test files.
 * It handles both string translations and object translations (via returnObjects: true).
 *
 * @param translations - A map of translation keys to their values (strings or nested objects)
 * @returns A mock TFunction that can be used in tests
 *
 * @example
 * ```typescript
 * const mockT = createMockT({
 *   'errors.dateOfBirth': {
 *     required: 'Enter your date of birth',
 *     maxLength: 'Must be 60 characters or less',
 *   },
 *   'errors.dateOfBirth.required': 'Enter your date of birth', // Also support direct key access
 * });
 *
 * // When called with returnObjects: true
 * mockT('errors.dateOfBirth', { returnObjects: true })
 * // Returns: { required: 'Enter your date of birth', maxLength: 'Must be 60 characters or less' }
 *
 * // When called without returnObjects
 * mockT('errors.dateOfBirth.required')
 * // Returns: 'Enter your date of birth'
 * ```
 */
export function createMockT(translations: Record<string, unknown>): TFunction {
  return ((key: string, options?: Record<string, unknown>) => {
    const value = translations[key];

    // Handle returnObjects: true - return object if it exists
    if (options?.returnObjects && typeof value === 'object' && !Array.isArray(value)) {
      return value;
    }

    // Handle string translations
    if (typeof value === 'string') {
      // Support interpolation if provided
      if (options && typeof options === 'object' && !options.returnObjects) {
        let result = value;
        for (const [placeholder, replacement] of Object.entries(options)) {
          result = result.replace(new RegExp(`{{\\s*${placeholder}\\s*}}`, 'g'), String(replacement));
        }
        return result;
      }
      return value;
    }

    // Fallback: return the key itself (i18next behavior for missing translations)
    return key;
  }) as TFunction;
}
