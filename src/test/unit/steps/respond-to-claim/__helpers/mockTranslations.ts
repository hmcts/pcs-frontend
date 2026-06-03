import type { TFunction } from 'i18next';

// Common keys that every step's `t` mock has historically reproduced inline.
// Step tests only need to add their step-specific keys.
export const COMMON_TRANSLATIONS: Record<string, string> = {
  'buttons.saveAndContinue': 'Save and continue',
  'buttons.continue': 'Continue',
  'buttons.saveForLater': 'Save for later',
  'buttons.cancel': 'Cancel',
  'errors.title': 'There is a problem',
  serviceName: 'Test service',
  phase: 'ALPHA',
  feedback: 'Feedback',
  back: 'Back',
  languageToggle: 'Language toggle',
  contactUsForHelp: 'Contact us for help',
  contactUsForHelpText: 'You can contact us for help.',
};

/** Echo the key. For tests asserting on translation keys rather than English copy. */
export const identityTranslator: TFunction = ((key: string) => key) as unknown as TFunction;

/**
 * Build a step `t` mock from a translations map. Step-specific keys take precedence
 * over `COMMON_TRANSLATIONS`. Unknown keys echo back, which matches the project's
 * fall-through behaviour in test fixtures.
 */
export function makeTranslator(stepTranslations: Record<string, string> = {}): TFunction {
  const merged: Record<string, string> = { ...COMMON_TRANSLATIONS, ...stepTranslations };
  return ((key: string) => merged[key] ?? key) as unknown as TFunction;
}
