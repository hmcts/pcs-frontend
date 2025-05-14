import { Request, Response } from 'express';
import { setFormData } from '../../app/controllers/sessionHelper';

export default class Page2PostController {
  constructor(private fields: string[]) {}

  post = (req: Request, res: Response): void => {
    const answer = req.body.answer;

    if (!answer || !this.fields.includes(answer)) {
      const content = {
        title: 'Do you agree?',
        error: 'Please select an option',
        yes: 'Yes',
        no: 'No',
        next: 'Continue',
        backUrl: '/steps/page1',
        serviceName: 'Possession claims'
      };
      return res.status(400).render('steps/page2/template.njk', {
        ...content,
        error: content.error
      });
    }

    setFormData(req, 'page2', { answer });

    const nextPage = answer === 'yes' ? '/steps/page3/yes' : '/steps/page3/no';
    res.redirect(nextPage);
  };
}
