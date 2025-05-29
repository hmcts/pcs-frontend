import { Request, Response } from 'express';

import type { StepFormData } from '../../interfaces/stepFormData.interface';

export type TranslationFn = (req: Request) => StepFormData;

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
