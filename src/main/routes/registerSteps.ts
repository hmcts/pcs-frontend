import { Application } from 'express';

import { stepsWithContent } from '../steps';

export default function (app: Application): void {
  for (const step of stepsWithContent) {
    if (step.getController) {
      app.get(step.url, step.getController.get);
    }
    if (step.postController?.post) {
      app.post(step.url, step.postController.post);
    }
  }
}
