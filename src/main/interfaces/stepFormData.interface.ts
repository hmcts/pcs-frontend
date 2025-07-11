import { RequestHandler } from 'express';

import { GetController } from '../app/controller/GetController';

export interface StepFormData {
  title?: string;
  error?: string;
  answer?: string;
  choices?: string[] | string;
  serviceName?: string;
  buttons?: {
    continue?: string;
    back?: string;
    cancel?: string;
  };
  [key: string]: unknown;
}

export interface StepDefinition {
  url: string;
  name: string;
  view: string;
  stepDir: string;
  generateContent: () => StepFormData;
  getController: GetController;
  postController?: { post: RequestHandler };
  middleware?: RequestHandler[];
}
