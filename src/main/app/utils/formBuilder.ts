import type { Request } from 'express';

import type { FormFieldConfig } from '../../interfaces/formFieldConfig.interface';
import type { StepDefinition } from '../../interfaces/stepFormData.interface';
import { createGetController, createPostController } from '../controller/controllerFactory';
import { getFormData } from '../controller/formHelpers';

import { type TranslationContent, createGenerateContent } from './i18n';

export interface FormBuilderConfig {
  stepName: string;
  journeyFolder: string; // e.g., 'userJourney', 'eligibility', etc.
  fields: FormFieldConfig[];
  beforeRedirect?: (req: Request) => Promise<void> | void;
  extendGetContent?: (req: Request, content: TranslationContent) => Record<string, unknown>;
  stepDir: string; // Directory of the step (use __dirname from the step file)
}

// Helper function to get nested translation values (e.g., 'options.rentArrears')
function getNestedTranslation(translations: TranslationContent, key: string): string | undefined {
  const keys = key.split('.');
  let value: unknown = translations;
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = (value as Record<string, unknown>)[k];
    } else {
      return undefined;
    }
  }
  return typeof value === 'string' ? value : undefined;
}

/**
 * Creates a step definition from a simple form configuration.
 * This is useful for pages that only need basic form fields (text, radio, checkbox).
 * For more complex pages, continue using custom step definitions.
 */
export function createFormStep(config: FormBuilderConfig): StepDefinition {
  const { stepName, journeyFolder, fields, beforeRedirect, extendGetContent, stepDir } = config;
  const generateContent = createGenerateContent(stepName, journeyFolder);

  const getFields = (t: TranslationContent = {}): FormFieldConfig[] => {
    const errors = (t.errors as Record<string, string>) || {};
    return fields.map(field => {
      // Get label: use direct label, or translation key, or fallback to fieldNameLabel pattern
      let label = field.label;
      if (!label && field.translationKey?.label) {
        label = (t[field.translationKey.label] as string) || undefined;
      }
      if (!label) {
        // Fallback: try fieldNameLabel pattern (for backward compatibility)
        const labelKey = `${field.name}Label`;
        label = (t[labelKey] as string) || field.name;
      }

      // Get hint: use direct hint, or translation key, or fallback to fieldNameHint pattern
      let hint = field.hint;
      if (!hint && field.translationKey?.hint) {
        hint = (t[field.translationKey.hint] as string) || undefined;
      }
      if (!hint) {
        // Fallback: try fieldNameHint pattern (for backward compatibility)
        const hintKey = `${field.name}Hint`;
        hint = (t[hintKey] as string) || undefined;
      }

      // Translate option texts if translationKey is provided
      const translatedOptions = field.options?.map(option => {
        let text = option.text;
        if (!text && option.translationKey) {
          // Support nested keys like 'options.rentArrears' or direct keys
          const translationValue = option.translationKey.includes('.')
            ? getNestedTranslation(t, option.translationKey)
            : (t[option.translationKey] as string);
          text = translationValue || option.value;
        } else if (!text) {
          // Fallback to value if no text or translation key
          text = option.value;
        }
        return {
          ...option,
          text,
        };
      });

      // Use translation for error message if not provided in config
      const errorMessage = field.errorMessage || errors[field.name];

      return {
        ...field,
        label,
        hint,
        errorMessage,
        options: translatedOptions,
      };
    });
  };

  // Convert journeyFolder to URL path (e.g., 'userJourney' -> 'user-journey')
  const journeyPath = journeyFolder.replace(/([A-Z])/g, '-$1').toLowerCase();
  // Shared form builder template used by all journeys
  // Since 'steps' directory is in Nunjucks search path, use relative path from there
  const viewPath = 'formBuilder.njk';

  return {
    url: `/steps/${journeyPath}/${stepName}`,
    name: stepName,
    view: viewPath,
    stepDir,
    generateContent,
    getController: () => {
      return createGetController(viewPath, stepName, generateContent, (req, content) => {
        // Note: createGetController already spreads formData into baseContent,
        // so we just need to add fields configuration and ensure field values are accessible
        const savedData = getFormData(req, stepName);

        // Get fields with labels from translations
        const fieldsWithLabels = getFields(content);

        // Get title from translations (could be 'title' or 'question')
        const pageTitle = (content.title as string) || (content.question as string) || undefined;

        // Build extended content - explicitly include all saved form data
        // This ensures saved form data is available when navigating back
        // Note: createGetController already spreads formData into baseContent,
        // but we also need to create a fieldValues object for dynamic template access
        const fieldValues: Record<string, unknown> = {};

        // Normalize field values and create fieldValues object for template access
        for (const field of fields) {
          if (field.type === 'checkbox') {
            // Handle checkbox arrays - ensure they're always arrays
            if (savedData?.[field.name]) {
              const value = savedData[field.name];
              if (typeof value === 'string') {
                fieldValues[field.name] = [value];
              } else if (Array.isArray(value)) {
                fieldValues[field.name] = value;
              } else {
                fieldValues[field.name] = [];
              }
            } else {
              fieldValues[field.name] = [];
            }
          } else {
            // For text and radio fields, use saved value or empty string
            fieldValues[field.name] = savedData?.[field.name] ?? '';
          }
        }

        const extendedContent: Record<string, unknown> = {
          // Include all saved data (for direct access like addressLine1, etc.)
          ...savedData,
          // Add fieldValues object for dynamic access in template
          fieldValues,
          // Then add our configuration
          fields: fieldsWithLabels,
          title: pageTitle,
        };

        // extendGetContent is still supported for backward compatibility and custom content
        return extendGetContent ? { ...extendedContent, ...extendGetContent(req, content) } : extendedContent;
      });
    },
    postController: createPostController(stepName, generateContent, getFields, viewPath, async (req: Request) => {
      // Normalize checkbox values - Express sends a single string when only one checkbox is selected
      for (const field of fields) {
        if (field.type === 'checkbox' && req.body[field.name]) {
          if (typeof req.body[field.name] === 'string') {
            req.body[field.name] = [req.body[field.name]];
          }
        }
      }

      if (beforeRedirect) {
        await beforeRedirect(req);
      }
    }),
  };
}
