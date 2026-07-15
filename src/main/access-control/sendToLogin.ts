import type { Request, Response } from 'express';

//  Ends the current session and returns the user to the IDAM login page.

export function sendToLogin(req: Request, res: Response): void {
  if (!req.session) {
    res.redirect('/login');
    return;
  }
  req.session.destroy(() => res.redirect('/login'));
}
