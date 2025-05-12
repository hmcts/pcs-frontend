import { Request, Response } from 'express';

export type TranslationFn = () => Record<string, string>;

export class GetController {
  constructor(
    private view: string,
    private generateContent: TranslationFn
  ) {}

  get = (req: Request, res: Response): void => {
    const content = this.generateContent();
    res.render(this.view, { ...content });
  };
}

