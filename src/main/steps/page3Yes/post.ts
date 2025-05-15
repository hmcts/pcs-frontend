import { Request, Response } from 'express';
import { setFormData } from '../../app/controller/sessionHelper';

export default class Page3YesPostController {
  post = (req: Request, res: Response): void => {
    const choices = Array.isArray(req.body.choices)
      ? req.body.choices
      : req.body.choices ? [req.body.choices] : [];

    setFormData(req, 'page3Yes', { choices });
    res.redirect('/dashboard/1');
  };
}
