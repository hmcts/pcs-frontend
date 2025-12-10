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
export type { FormBuilderConfig } from '../../interfaces/formFieldConfig.interface';

// Export form builder helpers (for use in custom step implementations)
export {
  getFormData,
  setFormData,
  validateForm,
  processFieldData,
  getTranslationErrors,
  getTranslation,
} from './formBuilder/helpers';

// Export step flow API
export {
  getNextStep,
  getPreviousStep,
  getStepUrl,
  checkStepDependencies,
  createStepNavigation,
  stepNavigation,
  stepDependencyCheckMiddleware,
} from './flow';

// Export step-specific i18n utilities
export {
  getStepNamespace,
  getStepTranslationPath,
  loadStepNamespace,
  getStepTranslations,
  getValidatedLanguage,
  getRequestLanguage,
  getTranslationFunction,
  validateTranslationKey,
} from './i18n';
export type { SupportedLang, TranslationContent } from './i18n';
