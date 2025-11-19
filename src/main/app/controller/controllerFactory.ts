import { Request, Response } from 'express';

import type { FormFieldConfig } from '../../interfaces/formFieldConfig.interface';
import type { StepFormData } from '../../interfaces/stepFormData.interface';
import { getValidatedLanguage } from '../utils/getValidatedLanguage';
import type { SupportedLang } from '../utils/getValidatedLanguage';
import { stepNavigation } from '../utils/stepNavigation';

import { GetController } from './GetController';
import { getFormData, setFormData } from './sessionHelper';
import { validateForm } from './validation';

type GenerateContentFn = (lang?: SupportedLang) => StepFormData;
type PostControllerCallback = (req: Request, res: Response) => Promise<void> | void;

export const createGetController = (
  view: string,
  stepName: string,
  generateContent: GenerateContentFn,
  extendContent?: (req: Request, content: StepFormData) => StepFormData
): GetController => {
  return new GetController(view, (req: Request) => {
    const formData = getFormData(req, stepName);
    const postData = req.body || {};

    // Get validated language and generate content
    const lang = getValidatedLanguage(req);
    const content = generateContent(lang);

    const selected = formData?.answer || formData?.choices || postData.answer || postData.choices;
    const baseContent = {
      ...content,
      ...formData,
      lang,
      pageUrl: req.originalUrl || '/',
      selected,
      t: req.t,
      answer: postData.answer ?? formData?.answer,
      choices: postData.choices ?? formData?.choices,
      error: postData.error,
      backUrl: stepNavigation.getBackUrl(req, stepName),
    };

    return {
      ...baseContent,
      ...(extendContent ? extendContent(req, content) : {}),
    };
  });
};

export const createPostRedirectController = (nextUrl: string): { post: (req: Request, res: Response) => void } => {
  return {
    post: (_req: Request, res: Response) => {
      res.redirect(nextUrl);
    },
  };
};

/**
 * Creates a post controller with automatic validation and redirect to next step
 * @param stepName - Name of the current step
 * @param generateContent - Function to generate content for error rendering
 * @param getFields - Function to get form field configurations
 * @param view - View template path for error rendering
 * @param beforeRedirect - Optional callback to execute before redirect (e.g., update CCD case)
 * @returns Post controller handler
 */
export const createPostController = (
  stepName: string,
  generateContent: GenerateContentFn,
  getFields: (content: StepFormData) => FormFieldConfig[],
  view: string,
  beforeRedirect?: PostControllerCallback
): { post: (req: Request, res: Response) => Promise<void | Response> } => {
  return {
    post: async (req: Request, res: Response) => {
      const lang: SupportedLang = getValidatedLanguage(req);
      const content = generateContent(lang);
      const fields = getFields(content);
      const errors = validateForm(req, fields);

      // Handle validation errors
      if (Object.keys(errors).length > 0) {
        const firstField = Object.keys(errors)[0];
        return res.status(400).render(view, {
          ...content,
          ...req.body,
          error: { field: firstField, text: errors[firstField] },
        });
      }

      // Save form data
      setFormData(req, stepName, req.body);

      // Execute custom logic before redirect (e.g., update CCD case)
      if (beforeRedirect) {
        await beforeRedirect(req, res);
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
  };
};

export const validateAndStoreForm = (
  stepName: string,
  fields: FormFieldConfig[],
  nextPage: string | ((body: StepFormData) => string),
  content?: StepFormData,
  templatePath?: string
): { post: (req: Request, res: Response) => void } => {
  return {
    post: (req: Request, res: Response) => {
      const errors = validateForm(req, fields);

      if (Object.keys(errors).length > 0) {
        return res.status(400).render(templatePath ?? `steps/${stepName}.njk`, {
          ...content,
          error: Object.values(errors)[0],
          ...req.body,
        });
      }

      for (const field of fields) {
        if (field.type === 'checkbox') {
          const value = req.body[field.name];
          if (typeof value === 'string') {
            req.body[field.name] = [value];
          }
        }
      }

      setFormData(req, stepName, req.body);

      const redirectUrl = typeof nextPage === 'function' ? nextPage(req.body) : nextPage;
      res.redirect(redirectUrl);
    },
  };
};
