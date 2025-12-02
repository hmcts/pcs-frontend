import { Request, Response } from 'express';

import type { FormFieldConfig } from '../../interfaces/formFieldConfig.interface';
import type { StepFormData } from '../../interfaces/stepFormData.interface';
import { type SupportedLang, getValidatedLanguage } from '../utils/i18n';
import { stepNavigation } from '../utils/stepFlow';

import { renderWithErrors } from './errorHandling';
import { getAllFormData, getFormData, setFormData, validateForm } from './formHelpers';

type GenerateContentFn = (lang?: SupportedLang) => StepFormData;
type PostControllerCallback = (req: Request, res: Response) => Promise<void> | void;
type TranslationFn = (req: Request) => StepFormData;

export class GetController {
  constructor(
    private view: string,
    private generateContent: TranslationFn
  ) {}

  get = (req: Request, res: Response): void => {
    const content = this.generateContent(req);
    res.render(this.view, {
      ...content,
    });
  };
}

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
      const errors = validateForm(req, fields, undefined, getAllFormData(req));

      // Handle validation errors
      if (Object.keys(errors).length > 0) {
        return renderWithErrors(req, res, view, errors, content);
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
      const errors = validateForm(req, fields, undefined, getAllFormData(req));

      if (Object.keys(errors).length > 0) {
        return renderWithErrors(req, res, templatePath ?? `steps/${stepName}.njk`, errors, content ?? {});
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
