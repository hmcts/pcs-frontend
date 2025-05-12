import { Request, Response } from 'express';

export default class Page1PostController {
  post = (req: Request, res: Response): void => {
    res.redirect('/steps/page2');
  };
}
