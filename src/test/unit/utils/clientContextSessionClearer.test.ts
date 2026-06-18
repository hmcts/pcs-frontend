import type { Request } from 'express';

import { clientContextSessionClearer } from '@utils/clientContextSessionClearer';

describe('clientContextSessionClearer', () => {
  let req: Partial<Request>;

  it('should delete clientContext', () => {
    req = {
      path: '/case/1234567890123456/respond-to-claim/start-now',
      session: {
        clientContext: {
          selectedPartyId: 'abc',
        },
      },
    } as unknown as Request;

    clientContextSessionClearer(req as Request);

    expect(req.session?.clientContext).toBeUndefined();
  });
});
