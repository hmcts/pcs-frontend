import { Request, Response } from 'express';

import type { FormFieldConfig } from '../../interfaces/formFieldConfig.interface';
import type { StepFormData } from '../../interfaces/stepFormData.interface';

import { GetController } from './GetController';
import { getFormData, setFormData } from './sessionHelper';
import { validateForm } from './validation';

export const createGetController = (
  view: string,
  stepName: string,
  content: StepFormData,
  extendContent?: (req: Request) => StepFormData
): GetController => {
  return new GetController(view, (req: Request) => {
    const supportedLanguages = ['en', 'cy'];
    const requestedLang = req.query.lang as string;

    if (requestedLang && supportedLanguages.includes(requestedLang) && req.session) {
      req.session.lang = requestedLang;
    }

    const lang = supportedLanguages.includes(req.session?.lang) ? req.session.lang : 'en';

    const formData = getFormData(req, stepName);
    const postData = req.body || {};

    const selected = formData?.answer || formData?.choices || postData.answer || postData.choices;

    return {
      ...content,
      ...formData,
      lang,
      selected,
      answer: postData.answer ?? formData?.answer,
      choices: postData.choices ?? formData?.choices,
      error: postData.error,
      ...(extendContent ? extendContent(req) : {}),
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
