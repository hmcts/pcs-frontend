import type { Request, Response } from 'express';

import type { FormFieldConfig } from '../../interfaces/formFieldConfig.interface';
import type { StepDefinition } from '../../interfaces/stepFormData.interface';
import { createGetController } from '../controller/controllerFactory';
import { getFormData, setFormData, validateForm } from '../controller/formHelpers';

import type { SupportedLang, TranslationContent } from './i18n';
import { createGenerateContent, getValidatedLanguage } from './i18n';
import { DASHBOARD_ROUTE, getDashboardUrl } from './routes';
import { stepNavigation } from './stepFlow';

export interface FormBuilderConfig {
  stepName: string;
  journeyFolder: string;
  fields: FormFieldConfig[];
  beforeRedirect?: (req: Request) => Promise<void> | void;
  extendGetContent?: (req: Request, content: TranslationContent) => Record<string, unknown>;
  stepDir: string;
  translationKeys?: {
    pageTitle?: string;
    content?: string;
  };
}

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

export function createFormStep(config: FormBuilderConfig): StepDefinition {
  const { stepName, journeyFolder, fields, beforeRedirect, extendGetContent, stepDir, translationKeys } = config;
  const generateContent = createGenerateContent(stepName, journeyFolder);

  const buildFormContent = (
    content: TranslationContent,
    bodyData: Record<string, unknown> = {}
  ): Record<string, unknown> => {
    const savedData = bodyData as Record<string, unknown>;
    const fieldsWithLabels = getFields(content);
    const pageTitle = (content.title as string) || (content.question as string) || undefined;

    const customPageTitle = translationKeys?.pageTitle
      ? (content[translationKeys.pageTitle] as string) || undefined
      : undefined;
    const pageContent = translationKeys?.content
      ? (content[translationKeys.content] as string) || undefined
      : undefined;

    const buttons = (content.buttons as Record<string, string>) || {};
    const errors = (content.errors as Record<string, string>) || {};
    const continueText = buttons.continue || 'Save and continue';
    const saveForLaterText = buttons.saveForLater || 'Save for later';
    const cancelText = buttons.cancel || 'Cancel';
    const errorSummaryTitle = errors.title || 'There is a problem';

    const fieldValues: Record<string, unknown> = {};

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
          fieldValues[field.name] = {
            day: (savedData[`${field.name}-day`] as string) || '',
            month: (savedData[`${field.name}-month`] as string) || '',
            year: (savedData[`${field.name}-year`] as string) || '',
          };
        } else {
          fieldValues[field.name] = { day: '', month: '', year: '' };
        }
      } else if (field.type === 'textarea' || field.type === 'character-count') {
        fieldValues[field.name] = savedData?.[field.name] ?? '';
      } else {
        fieldValues[field.name] = savedData?.[field.name] ?? '';
      }
    }

    return {
      ...savedData,
      fieldValues,
      fields: fieldsWithLabels,
      title: pageTitle,
      pageTitle: customPageTitle,
      content: pageContent,
      continue: continueText,
      saveForLater: saveForLaterText,
      cancel: cancelText,
      errorSummaryTitle,
      stepName,
      journeyFolder,
    };
  };

  const getFields = (t: TranslationContent = {}): FormFieldConfig[] => {
    const errors = (t.errors as Record<string, string>) || {};
    return fields.map(field => {
      let label = field.label;
      if (!label && field.translationKey?.label) {
        label = (t[field.translationKey.label] as string) || undefined;
      }
      if (!label) {
        const labelKey = `${field.name}Label`;
        label = (t[labelKey] as string) || field.name;
      }

      let hint = field.hint;
      if (!hint && field.translationKey?.hint) {
        hint = (t[field.translationKey.hint] as string) || undefined;
      }
      if (!hint) {
        const hintKey = `${field.name}Hint`;
        hint = (t[hintKey] as string) || undefined;
      }

      const translatedOptions = field.options?.map(option => {
        let text = option.text;
        if (!text && option.translationKey) {
          const translationValue = option.translationKey.includes('.')
            ? getNestedTranslation(t, option.translationKey)
            : (t[option.translationKey] as string);
          text = translationValue || option.value;
        } else if (!text) {
          text = option.value;
        }
        return {
          ...option,
          text,
        };
      });

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

  const journeyPath = journeyFolder.replace(/([A-Z])/g, '-$1').toLowerCase();
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
        const ccdId = req.session?.ccdCase?.id;
        const result = extendGetContent ? { ...formContent, ...extendGetContent(req, content) } : formContent;
        return { ...result, ccdId, dashboardRoute: DASHBOARD_ROUTE };
      });
    },
    postController: {
      post: async (req: Request, res: Response) => {
        const lang: SupportedLang = getValidatedLanguage(req);
        const content = generateContent(lang);
        const action = req.body.action as string | undefined;

        if (action === 'saveForLater') {
          for (const field of fields) {
            if (field.type === 'checkbox' && req.body[field.name]) {
              if (typeof req.body[field.name] === 'string') {
                req.body[field.name] = [req.body[field.name]];
              }
            } else if (field.type === 'date') {
              const day = req.body[`${field.name}-day`]?.trim() || '';
              const month = req.body[`${field.name}-month`]?.trim() || '';
              const year = req.body[`${field.name}-year`]?.trim() || '';

              req.body[field.name] = { day, month, year };
              delete req.body[`${field.name}-day`];
              delete req.body[`${field.name}-month`];
              delete req.body[`${field.name}-year`];
            }
          }

          const bodyWithoutAction = { ...req.body };
          delete bodyWithoutAction.action;
          setFormData(req, stepName, bodyWithoutAction);

          const ccdId = req.session?.ccdCase?.id;
          return res.redirect(303, getDashboardUrl(ccdId));
        }

        const fieldsWithLabels = getFields(content);
        const translationErrors = (content.errors as Record<string, string>) || {};
        const errors = validateForm(req, fieldsWithLabels, translationErrors);

        if (Object.keys(errors).length > 0) {
          const firstField = Object.keys(errors)[0];
          const formContent = buildFormContent(content, req.body);

          const ccdId = req.session?.ccdCase?.id;
          return res.status(400).render(viewPath, {
            ...content,
            ...formContent,
            error: { field: firstField, text: errors[firstField] },
            backUrl: stepNavigation.getBackUrl(req, stepName),
            lang,
            pageUrl: req.originalUrl || '/',
            t: req.t,
            ccdId,
            dashboardRoute: DASHBOARD_ROUTE,
          });
        }

        for (const field of fields) {
          if (field.type === 'checkbox' && req.body[field.name]) {
            if (typeof req.body[field.name] === 'string') {
              req.body[field.name] = [req.body[field.name]];
            }
          } else if (field.type === 'date') {
            const day = req.body[`${field.name}-day`]?.trim() || '';
            const month = req.body[`${field.name}-month`]?.trim() || '';
            const year = req.body[`${field.name}-year`]?.trim() || '';

            req.body[field.name] = { day, month, year };
            delete req.body[`${field.name}-day`];
            delete req.body[`${field.name}-month`];
            delete req.body[`${field.name}-year`];
          }
        }

        const bodyWithoutAction = { ...req.body };
        delete bodyWithoutAction.action;

        setFormData(req, stepName, bodyWithoutAction);

        if (beforeRedirect) {
          await beforeRedirect(req);
          if (res.headersSent) {
            return;
          }
        }

        const redirectPath = stepNavigation.getNextStepUrl(req, stepName, bodyWithoutAction);

        if (!redirectPath) {
          return res.status(500).send('Unable to determine next step');
        }

        res.redirect(303, redirectPath);
      },
    },
  };
}
