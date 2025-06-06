import { Application } from 'express';

import registerSteps from '../../../main/routes/registerSteps';
import { oidcMiddleware, ccdCaseMiddleware } from '../../../main/middleware';

jest.mock('steps', () => {
  const protectedStep = {
    url: '/steps/protected',
    getController: { get: jest.fn() },
    postController: { post: jest.fn() },
  };

  const unprotectedStep = {
    url: '/steps/unprotected',
    getController: { get: jest.fn() },
    postController: { post: jest.fn() },
  };

  return {
    stepsWithContent: [protectedStep, unprotectedStep],
    protectedSteps: [protectedStep], // ← Only this one is protected
  };
});

jest.mock('../../../main/middleware', () => ({
  oidcMiddleware: jest.fn((req, res, next) => next()),
  ccdCaseMiddleware: jest.fn((req, res, next) => next()),
}));

describe('registerSteps', () => {
  const mockGet = jest.fn();
  const mockPost = jest.fn();

  const app = {
    get: mockGet,
    post: mockPost,
  } as unknown as Application;

  beforeEach(() => {
    mockGet.mockClear();
    mockPost.mockClear();
    (oidcMiddleware as jest.Mock).mockClear();
    (ccdCaseMiddleware as jest.Mock).mockClear();
  });

  it('registers GET and POST with middlewares for protected steps', () => {
    registerSteps(app);

    expect(mockGet).toHaveBeenCalledWith(
      '/steps/protected',
      expect.any(Function),
      expect.any(Function),
      expect.any(Function)
    );

    expect(mockPost).toHaveBeenCalledWith(
      '/steps/protected',
      expect.any(Function),
      expect.any(Function),
      expect.any(Function)
    );
  });

  it('registers GET and POST without middlewares for unprotected steps', () => {
    registerSteps(app);

    expect(mockGet).toHaveBeenCalledWith(
      '/steps/unprotected',
      expect.any(Function)
    );

    expect(mockPost).toHaveBeenCalledWith(
      '/steps/unprotected',
      expect.any(Function)
    );
  });
});
