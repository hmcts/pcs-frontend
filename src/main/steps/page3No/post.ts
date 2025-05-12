import { Request, Response } from 'express';

export default class Page3YesPostController {
  post = (req: Request, res: Response): void => {
    res.redirect('/steps/page4');
  };
}
