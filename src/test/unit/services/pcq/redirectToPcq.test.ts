import type { Request } from 'express';

import { redirectToPcq } from '@services/pcq/redirectToPcq';
import { startPcq } from '@services/pcq/startPcq';

jest.mock('@services/pcq/startPcq', () => ({
  startPcq: jest.fn(),
}));

describe('redirectToPcq', () => {
  const buildReq = (): { req: Request; redirect: jest.Mock } => {
    const redirect = jest.fn();
    return { req: { res: { redirect } } as unknown as Request, redirect };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('303-redirects to the PCQ url and reports that it handled the response', async () => {
    (startPcq as jest.Mock).mockResolvedValue('https://pcq.test/service-endpoint?token=abc');
    const { req, redirect } = buildReq();

    await expect(redirectToPcq(req)).resolves.toBe(true);

    // Issued here rather than via resolveRedirectAfterPost, which routes through safeRedirect303
    // and blocks off-site origins.
    expect(redirect).toHaveBeenCalledWith(303, 'https://pcq.test/service-endpoint?token=abc');
  });

  it('leaves the response untouched when PCQ is unavailable or already answered', async () => {
    (startPcq as jest.Mock).mockResolvedValue(null);
    const { req, redirect } = buildReq();

    await expect(redirectToPcq(req)).resolves.toBe(false);
    expect(redirect).not.toHaveBeenCalled();
  });
});
