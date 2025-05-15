import { createGetController } from '../../app/controller/controllerFactory';
import page2Content from '../../assets/locales/en/page2.json';
import common from '../../assets/locales/en/common.json';
import { validateForm, FormFieldConfig } from '../../app/controller/validation';
import { setFormData } from '../../app/controller/sessionHelper';
import { Request, Response } from 'express';

const content = { ...common, ...page2Content };

export const step = {
  url: '/steps/page2',
  name: 'page2',
  view: 'steps/page2/template.njk',
  generateContent: () => content,
  stepDir: __dirname,
  getController: createGetController(__dirname, 'page2', content),
  postController: {
    post: (req: Request, res: Response) => {
      const fieldConfig: FormFieldConfig[] = [
        {
          name: 'answer',
          type: 'radio',
          required: true,
          errorMessage: content.errors.answerRequired
        }
      ];

      const errors = validateForm(req, fieldConfig);

      if (Object.keys(errors).length > 0) {
        const errorContent = {
          ...content,
          error: errors.answer,
          selected: req.body.answer
        };
        return res.status(400).render('steps/page2/template.njk', errorContent);
      }

      setFormData(req, 'page2', { answer: req.body.answer });

      const nextPage = req.body.answer === 'yes' ? '/steps/page3/yes' : '/steps/page3/no';
      res.redirect(nextPage);
    }
  }
};
