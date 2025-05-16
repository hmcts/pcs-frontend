import { Request, Response } from 'express';

export type TranslationFn = (req: Request) => Record<string, any>;

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
