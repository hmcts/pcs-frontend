import { createGetController } from '../../app/controller/controllerFactory';
import page3YesContent from '../../assets/locales/en/page3Yes.json';
import common from '../../assets/locales/en/common.json';
import { setFormData } from '../../app/controller/sessionHelper';
import { Request, Response } from 'express';

const content = { ...common, ...page3YesContent };

export const step = {
  url: '/steps/page3/yes',
  name: 'page3Yes',
  view: 'steps/page3Yes/template.njk',
  generateContent: () => content,
  stepDir: __dirname,
  getController: createGetController(__dirname, 'page3Yes', content),
  postController: {
    post: (req: Request, res: Response) => {
      const choices = Array.isArray(req.body.choices)
        ? req.body.choices
        : req.body.choices ? [req.body.choices] : [];

      setFormData(req, 'page3Yes', { choices });

      res.redirect('/dashboard/1');
    }
  }
};
