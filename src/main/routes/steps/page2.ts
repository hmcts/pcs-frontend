import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  res.render('steps/page2', { error: null });
});

router.post('/', (req: Request, res: Response) => {
  const { answer } = req.body;
  if (!answer) {
    return res.render('steps/page2', { error: 'Please select an option' });
  }

  req.session.formData = req.session.formData || {};
  req.session.formData.page2 = { answer };
  req.session.completedSteps = req.session.completedSteps || [];
  if (!req.session.completedSteps.includes('page2')) {
    req.session.completedSteps.push('page2');
  }

  res.redirect(answer === 'yes' ? '/steps/page3/yes' : '/steps/page3/no');
});

export default router;
