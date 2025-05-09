import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  res.render('steps/page1');
});

router.post('/', (req: Request, res: Response) => {
  req.session.completedSteps = req.session.completedSteps || [];
  if (!req.session.completedSteps.includes('page1')) {
    req.session.completedSteps.push('page1');
  }
  res.redirect('/steps/page2');
});

export default router;
