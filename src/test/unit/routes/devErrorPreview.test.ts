import type { Application } from 'express';

import devErrorPreview from '../../../main/routes/devErrorPreview';

//Temporary tests to ensure the route is registered correctly for testing error pages in the preview environment. Not intended for production use.
describe('devErrorPreview route', () => {
  it('registers the preview route', () => {
    const app = { get: jest.fn() } as unknown as Application;

    devErrorPreview(app);

    expect(app.get).toHaveBeenCalledWith('/dev/error/:status', expect.any(Function));
  });
});
