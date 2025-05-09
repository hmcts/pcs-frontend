import { Router, Request, Response } from 'express';
import { oidcMiddleware } from '../../middleware';

const router = Router();

router.get('/', oidcMiddleware, (req: Request, res: Response) => {
  res.render('steps/page4');
});

router.post('/', oidcMiddleware, (req: Request, res: Response) => {
  res.redirect('/confirmation');
});

export default router;
