import { Request, Response } from 'express';
import { GetController } from './GetController';
import { getFormData, setFormData } from './sessionHelper';
import { validateForm, FormFieldConfig } from './validation';

export const createGetController = (
  view: string,
  stepName: string,
  content: Record<string, any>,
  extendContent?: (req: Request) => Record<string, any>
) => {
  return new GetController(view, (req: Request) => {
    const formData = getFormData(req, stepName);
    const postData = req.body || {};

    const selected = formData?.answer || formData?.choices || postData.answer || postData.choices;

    return {
      ...content,
      selected,
      answer: postData.answer ?? formData?.answer,
      choices: postData.choices ?? formData?.choices,
      error: postData.error,
      ...(extendContent ? extendContent(req) : {})
    };
  });
};


export const createPostRedirectController = (nextUrl: string) => {
  return {
    post: (_req: Request, res: Response) => {
      res.redirect(nextUrl);
    }
  };
};

export const validateAndStoreForm = (
  stepName: string,
  fields: FormFieldConfig[],
  nextPage: string | ((body: Record<string, any>) => string),
  content?: Record<string, any>
) => {
  return {
    post: (req: Request, res: Response) => {
      const errors = validateForm(req, fields);

      if (Object.keys(errors).length > 0) {
        return res.status(400).render(`steps/${stepName}.njk`, {
          ...content,
          error: Object.values(errors)[0],
          ...req.body
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
    }
  };
};
