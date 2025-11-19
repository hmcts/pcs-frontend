import { Request, Response } from 'express';

import type { FormFieldConfig } from '../../interfaces/formFieldConfig.interface';
import type { StepFormData } from '../../interfaces/stepFormData.interface';
import { getValidatedLanguage } from '../utils/getValidatedLanguage';
import type { SupportedLang } from '../utils/getValidatedLanguage';

import { GetController } from './GetController';
import { getFormData, setFormData } from './sessionHelper';
import { validateForm } from './validation';

type GenerateContentFn = (lang?: SupportedLang) => StepFormData;

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
