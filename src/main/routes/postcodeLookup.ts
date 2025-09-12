import { Application, Request, Response } from 'express';

import { oidcMiddleware } from '../middleware';
import { getAddressesByPostcode } from '../services/osPostcodeLookupService';

export default function postcodeLookupRoutes(app: Application): void {
  // Auth-protected API endpoint to fetch addresses for a postcode
  app.get('/api/postcode-lookup', oidcMiddleware, async (req: Request, res: Response) => {
    const postcode = String(req.query.postcode || '').trim();
    if (!postcode) {
      return res.status(400).json({ error: 'Missing postcode' });
    }

    try {
      const addresses = await getAddressesByPostcode(postcode);
      return res.json({ addresses });
    } catch {
      return res.status(502).json({ error: 'Failed to lookup postcode' });
    }
  });
}
