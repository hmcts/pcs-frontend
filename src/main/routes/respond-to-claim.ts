import { Router, Request, Response } from 'express';

const router = Router();

router.get('/respond-to-claim/start-now', (req: Request, res: Response) => {
  res.render('respond-to-claim/start-now');
});

export default router;