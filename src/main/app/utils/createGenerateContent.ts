import { type SupportedLang } from './getValidatedLanguage';
import { type TranslationContent, loadTranslations } from './loadTranslations';

/**
 * Creates a generateContent function for steps
 * @param stepName - The step name (e.g., 'enter-user-details' -> namespace 'enterUserDetails')
 * @param folder - The folder path for translations (e.g., 'userJourney')
 * @returns A function that loads translations for the step
 */
export const createGenerateContent = (stepName: string, folder: string) => {
  // Convert step name from kebab-case to camelCase for namespace
  // e.g., 'enter-user-details' -> 'enterUserDetails'
  const namespace = stepName
    .split('-')
    .map((part, index) => (index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
    .join('');

  return (lang: SupportedLang = 'en'): TranslationContent => {
    return loadTranslations(lang, ['common', `${folder}/${namespace}`]);
  };
};
