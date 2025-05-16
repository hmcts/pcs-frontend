import { Application } from 'express';

jest.mock('steps', () => ({
  stepsWithContent: [
    {
      url: '/steps/page1',
      getController: { get: jest.fn() },
      postController: { post: jest.fn() },
    },
    {
      url: '/steps/page2',
      getController: { get: jest.fn() },
      // no postController here
    },
  ]
}));

import registerSteps from '../../../main/routes/registerSteps';

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
  });

  it('registers GET routes for all steps', () => {
    registerSteps(app);

    expect(mockGet).toHaveBeenCalledWith('/steps/page1', expect.any(Function));
    expect(mockGet).toHaveBeenCalledWith('/steps/page2', expect.any(Function));
  });

  it('registers POST routes only for steps with postController', () => {
    registerSteps(app);

    expect(mockPost).toHaveBeenCalledWith('/steps/page1', expect.any(Function));
    expect(mockPost).not.toHaveBeenCalledWith('/steps/page2', expect.any(Function));
  });
});
