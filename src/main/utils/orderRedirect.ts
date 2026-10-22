import type { Request, Response } from 'express';

/** fetch must navigate itself: XUI is a different origin, so following its redirect would fail CORS. */
export function orderRedirect(req: Request, res: Response, url: string): void {
  if (req.method === 'POST' && req.is('application/json')) {
    res.json({ redirectUrl: url });
  } else {
    res.redirect(url);
  }
}
