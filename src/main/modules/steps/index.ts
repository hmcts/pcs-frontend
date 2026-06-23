/**
 * Steps Framework Module
 *
 * Provides utilities for building and managing form steps in multi-step journeys.
 * This module handles step navigation, form building, validation, content generation,
 * controller creation, and step-specific translation utilities.
 */

// Export controller factory API
export { GetController, createGetController, createPostController, createPostRedirectController } from './controller';

// Export form builder API
export { createFormStep } from './formBuilder';
export type { FormBuilderConfig } from '@modules/steps/formBuilder/formFieldConfig.interface';

// Export form builder helpers (for use in custom step implementations)
export {
  getFormData,
  setFormData,
  validateForm,
  normalizeCheckboxFields,
  processFieldData,
  getTranslationErrors,
  getCustomErrorTranslations,
  getTranslation,
} from './formBuilder/helpers';

// Export step flow API
export {
  getNextStep,
  getPreviousStep,
  getStepUrl,
  checkStepDependencies,
  createStepNavigation,
  stepDependencyCheckMiddleware,
} from './flow';

// Export step-specific i18n utilities
export {
  getStepTranslationPath,
  loadStepNamespace,
  loadStepNamespaces,
  getStepTranslations,
  getTranslationFunction,
  validateTranslationKey,
} from './i18n';

// Export step request-context helpers
export { withStepContext } from './stepContext';
export type { StepContext } from './stepContext';

// Re-export language utilities from main i18n module for convenience
export { getRequestLanguage, getValidatedLanguage } from '../i18n';
export type { SupportedLang, TranslationContent } from './i18n';
