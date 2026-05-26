import type { Application } from 'express';

import devErrorPreview from '../../../main/routes/devErrorPreview';

describe('devErrorPreview route', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('does not register the preview route in production', () => {
    process.env.NODE_ENV = 'production';
    const app = { get: jest.fn() } as unknown as Application;

    devErrorPreview(app);

    expect(app.get).not.toHaveBeenCalled();
  });

  it('registers the preview route outside production', () => {
    process.env.NODE_ENV = 'development';
    const app = { get: jest.fn() } as unknown as Application;

    devErrorPreview(app);

    expect(app.get).toHaveBeenCalledWith('/dev/error/:status', expect.any(Function));
  });
});
