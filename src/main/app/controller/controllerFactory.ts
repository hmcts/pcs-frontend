import { Request, Response } from 'express';
import path from 'path';
import { GetController } from './GetController';
import { getFormData } from './sessionHelper';

export const createGetController = (stepDir: string, stepName: string, content: Record<string, any>) => {
  const view = path.join('steps', path.basename(stepDir), 'template.njk');
  return new GetController(view, (req: Request) => {
    const formData = getFormData(req, stepName);
    return {
      ...content,
      selected: formData?.answer || formData?.choices,
      serviceName: content.serviceName
    };
  });
};

export const createPostRedirectController = (nextUrl: string) => {
  return {
    post: (_req: Request, res: Response) => res.redirect(nextUrl)
  };
};
