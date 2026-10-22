import type { Request, Response } from 'express';

import { HTTPError } from '../HttpError';

import { manageCaseDetailsUrl } from '@utils/orderCase';

/** fetch must navigate itself: XUI is a different origin, so following its redirect would fail CORS. */
export function orderRedirect(req: Request, res: Response, url: string): void {
  // Only local navigation or the configured XUI case page is valid for these forms.
  const localOrigin = 'https://pcs.invalid';
  if (
    !(url.startsWith('/') && new URL(url, localOrigin).origin === localOrigin) &&
    url !== manageCaseDetailsUrl(req.params.caseReference as string)
  ) {
    throw new HTTPError('Invalid order redirect', 400);
  }
  if (req.method === 'POST' && req.is('application/json')) {
    res.json({ redirectUrl: url });
  } else {
    res.redirect(url);
  }
}
