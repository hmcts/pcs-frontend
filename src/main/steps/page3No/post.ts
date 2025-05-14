import { Request, Response } from 'express';

export default class Page3NoPostController {
  post = (req: Request, res: Response): void => {
    res.redirect('/steps/page4');
  };
}
