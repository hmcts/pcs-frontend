import { Request, Response } from 'express';
import { generateContent } from './content';
import { getFormData } from '../../app/controllers/sessionHelper';

export default class Page2GetController {
  constructor(private view: string) {}

  get = (req: Request, res: Response): void => {
    const formData = getFormData<{ answer?: string }>(req, 'page2');
    const content = generateContent();

    res.render(this.view, {
      ...content,
      selected: formData?.answer,
      serviceName: 'Possession claims'
    });
  };
}
