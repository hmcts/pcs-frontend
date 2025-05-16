import { RequestHandler } from 'express';

import { GetController } from '../app/controller/GetController';

export interface StepDefinition {
  url: string;
  name: string;
  view: string;
  stepDir: string;
  generateContent: () => Record<string, any>;
  getController: GetController;
  postController?: { post: RequestHandler };
}
