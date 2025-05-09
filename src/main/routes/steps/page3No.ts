import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  res.render('steps/page3No', { error: null });
});

router.post('/', (req: Request, res: Response) => {
  const { checkboxes } = req.body;
  if (!checkboxes) {
    return res.render('steps/page3No', { error: 'Please select at least one option' });
  }

  req.session.formData.page3No = { checkboxes };
  req.session.completedSteps?.push('page3No');

  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.redirect('/login');
  }
  res.redirect('/steps/page4');
});

export default router;
