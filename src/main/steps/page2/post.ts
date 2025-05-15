import { Request, Response } from 'express';
import { generateContent } from './content';
import { setFormData } from '../../app/controller/sessionHelper';
import { validateForm, FormFieldConfig } from '../../app/controller/validation';

export default class Page2PostController {
  post = (req: Request, res: Response): void => {
    const fieldConfig: FormFieldConfig[] = [
      {
        name: 'answer',
        type: 'radio',
        required: true,
        errorMessage: 'Please select an option'
      }
    ];

    const errors = validateForm(req, fieldConfig);

    if (Object.keys(errors).length > 0) {
      const content = {
        ...generateContent(),
        error: errors.answer,
        selected: req.body.answer,
        serviceName: 'Possession claims'
      };
      return res.status(400).render('steps/page2/template.njk', content);
    }

    setFormData(req, 'page2', { answer: req.body.answer });

    const nextPage = req.body.answer === 'yes' ? '/steps/page3/yes' : '/steps/page3/no';
    res.redirect(nextPage);
  };
}
