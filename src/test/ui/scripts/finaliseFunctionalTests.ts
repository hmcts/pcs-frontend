import { ErrorMessageValidation , PageContentValidation , PageNavigationValidation } from '../utils/validations/custom-validations';

export function finaliseFunctionalTests(): void {
  const errors: Error[] = [];

  try {
    PageContentValidation.finaliseTest();
  } catch (error) {
    errors.push(error as Error);
  }

  try {
    ErrorMessageValidation.finaliseTest();
  } catch (error) {
    errors.push(error as Error);
  }

  try {
    PageNavigationValidation.finaliseTest();
  } catch (error) {
    errors.push(error as Error);
  }

  if (errors.length > 0) {
    const errorMessages = errors.map(e => e.message).join('\n\n');
    throw new Error(`\n❌ VALIDATION FAILURES:\n\n${errorMessages}`);
  }
}
