import type { Request, Response } from 'express';

import type { FormFieldConfig } from '../../interfaces/formFieldConfig.interface';
import type { StepDefinition } from '../../interfaces/stepFormData.interface';
import { createGetController } from '../controller/controllerFactory';
import { getFormData, setFormData, validateForm } from '../controller/formHelpers';

import { type SupportedLang, type TranslationContent, createGenerateContent, getValidatedLanguage } from './i18n';
import { stepNavigation } from './stepFlow';

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

  // Helper function to build form content (used for both GET and error rendering)
  const buildFormContent = (
    content: TranslationContent,
    bodyData: Record<string, unknown> = {}
  ): Record<string, unknown> => {
    const savedData = bodyData as Record<string, unknown>;
    const fieldsWithLabels = getFields(content);
    const pageTitle = (content.title as string) || (content.question as string) || undefined;

    // Use common translations for continue and errorSummaryTitle (from buttons.continue and errors.title)
    const buttons = (content.buttons as Record<string, string>) || {};
    const errors = (content.errors as Record<string, string>) || {};
    const continueText = buttons.continue || 'Continue';
    const errorSummaryTitle = errors.title || 'There is a problem';

    const fieldValues: Record<string, unknown> = {};

    // Normalize field values and create fieldValues object for template access
    for (const field of fields) {
      if (field.type === 'checkbox') {
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
      } else if (field.type === 'date') {
        // Handle date fields - normalize from body data or saved data
        if (savedData?.[field.name] && typeof savedData[field.name] === 'object') {
          const dateValue = savedData[field.name] as { day?: string; month?: string; year?: string };
          fieldValues[field.name] = {
            day: dateValue.day || '',
            month: dateValue.month || '',
            year: dateValue.year || '',
          };
        } else if (
          savedData?.[`${field.name}-day`] ||
          savedData?.[`${field.name}-month`] ||
          savedData?.[`${field.name}-year`]
        ) {
          // Handle date fields from form submission (day, month, year as separate fields)
          fieldValues[field.name] = {
            day: (savedData[`${field.name}-day`] as string) || '',
            month: (savedData[`${field.name}-month`] as string) || '',
            year: (savedData[`${field.name}-year`] as string) || '',
          };
        } else {
          fieldValues[field.name] = { day: '', month: '', year: '' };
        }
      } else if (field.type === 'textarea') {
        // For textarea fields, use saved value or empty string
        fieldValues[field.name] = savedData?.[field.name] ?? '';
      } else {
        // For text and radio fields, use saved value or empty string
        fieldValues[field.name] = savedData?.[field.name] ?? '';
      }
    }

    return {
      ...savedData,
      fieldValues,
      fields: fieldsWithLabels,
      title: pageTitle,
      continue: continueText,
      errorSummaryTitle,
    };
  };

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
        const savedData = getFormData(req, stepName);
        const formContent = buildFormContent(content, savedData);

        // extendGetContent is still supported for backward compatibility and custom content
        return extendGetContent ? { ...formContent, ...extendGetContent(req, content) } : formContent;
      });
    },
    postController: {
      post: async (req: Request, res: Response) => {
        const lang: SupportedLang = getValidatedLanguage(req);
        const content = generateContent(lang);
        const fieldsWithLabels = getFields(content);
        // Pass errors object from translations for validation messages
        const translationErrors = (content.errors as Record<string, string>) || {};
        const errors = validateForm(req, fieldsWithLabels, translationErrors);

        // Handle validation errors - include fields and fieldValues in the error response
        if (Object.keys(errors).length > 0) {
          const firstField = Object.keys(errors)[0];
          // Build form content with submitted data for error display
          const formContent = buildFormContent(content, req.body);

          return res.status(400).render(viewPath, {
            ...content,
            ...formContent,
            error: { field: firstField, text: errors[firstField] },
            backUrl: stepNavigation.getBackUrl(req, stepName),
            lang,
            pageUrl: req.originalUrl || '/',
            t: req.t,
          });
        }

        // Normalize checkbox and date values before saving
        for (const field of fields) {
          if (field.type === 'checkbox' && req.body[field.name]) {
            if (typeof req.body[field.name] === 'string') {
              req.body[field.name] = [req.body[field.name]];
            }
          } else if (field.type === 'date') {
            // Normalize date fields - combine day, month, year into an object
            const day = req.body[`${field.name}-day`]?.trim() || '';
            const month = req.body[`${field.name}-month`]?.trim() || '';
            const year = req.body[`${field.name}-year`]?.trim() || '';

            req.body[field.name] = {
              day,
              month,
              year,
            };

            // Remove the individual day/month/year fields from body
            delete req.body[`${field.name}-day`];
            delete req.body[`${field.name}-month`];
            delete req.body[`${field.name}-year`];
          }
        }

        // Save form data
        setFormData(req, stepName, req.body);

        // Execute custom logic before redirect (e.g., update CCD case)
        if (beforeRedirect) {
          await beforeRedirect(req);
          // If beforeRedirect sent a response, don't continue
          if (res.headersSent) {
            return;
          }
        }

        // Get next step URL and redirect
        const redirectPath = stepNavigation.getNextStepUrl(req, stepName, req.body);

        if (!redirectPath) {
          return res.status(500).send('Unable to determine next step');
        }

        res.redirect(303, redirectPath);
      },
    },
  };
}
