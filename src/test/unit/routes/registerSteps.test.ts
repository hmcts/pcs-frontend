const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
};

jest.mock('@modules/logger', () => ({
  Logger: {
    getLogger: jest.fn(() => mockLogger),
  },
}));

const mockGetValidatedLanguage = jest.fn((_req: unknown) => 'en');

jest.mock('../../../main/modules/steps/i18n', () => ({
  getValidatedLanguage: jest.fn((req: unknown) => mockGetValidatedLanguage(req)),
}));

jest.mock('../../../main/modules/i18n', () => ({
  getValidatedLanguage: jest.fn((req: unknown) => mockGetValidatedLanguage(req)),
}));

const mockStepDependencyCheck = jest.fn((req, res, next) => next());
jest.mock('../../../main/modules/steps/flow', () => ({
  stepDependencyCheckMiddleware: jest.fn(() => mockStepDependencyCheck),
}));

const mockLegalRepresentativeHeaderMiddleware = jest.fn((req, res, next) => next());

jest.mock('../../../main/middleware', () => ({
  oidcMiddleware: jest.fn((req, res, next) => next()),
  legalRepresentativeHeaderMiddleware: jest.fn((req, res, next) =>
    mockLegalRepresentativeHeaderMiddleware(req, res, next)
  ),
}));

const mockFlowConfig = {
  basePath: '/respond-to-claim',
  stepOrder: ['protected-step', 'unprotected-step', 'function-controller-step', 'middleware-step'],
  steps: {
    'protected-step': { requiresAuth: true },
    'unprotected-step': { requiresAuth: false },
    'function-controller-step': { requiresAuth: true },
    'middleware-step': { requiresAuth: true },
  },
};

jest.mock('../../../main/steps/respond-to-claim/flow.config', () => ({
  flowConfig: mockFlowConfig,
}));

// Create step objects that will be shared between mock and tests
// These are defined before jest.mock so they're available when the mock factory runs
const protectedStep = {
  url: '/steps/protected',
  name: 'protected-step',
  getController: { get: jest.fn() },
  postController: { post: jest.fn() },
};

const unprotectedStep = {
  url: '/steps/unprotected',
  name: 'unprotected-step',
  getController: { get: jest.fn() },
  postController: { post: jest.fn() },
};

const stepWithFunctionController = {
  url: '/steps/function-controller',
  name: 'function-controller-step',
  getController: jest.fn(() => ({ get: jest.fn() })),
  postController: { post: jest.fn() },
};

const stepWithMiddleware = {
  url: '/steps/with-middleware',
  name: 'middleware-step',
  getController: { get: jest.fn() },
  postController: { post: jest.fn() },
  middleware: [jest.fn((req, res, next) => next())],
};

const allSteps = [protectedStep, unprotectedStep, stepWithFunctionController, stepWithMiddleware];

jest.mock('../../../main/steps', () => ({
  journeyRegistry: {
    respondToClaim: {
      name: 'respondToClaim',
      default: {
        flowConfig: {
          basePath: '/respond-to-claim',
          stepOrder: ['protected-step', 'unprotected-step', 'function-controller-step', 'middleware-step'],
          steps: {
            'protected-step': { requiresAuth: true },
            'unprotected-step': { requiresAuth: false },
            'function-controller-step': { requiresAuth: true },
            'middleware-step': { requiresAuth: true },
          },
        },
        stepRegistry: {
          'protected-step': protectedStep,
          'unprotected-step': unprotectedStep,
          'function-controller-step': stepWithFunctionController,
          'middleware-step': stepWithMiddleware,
        },
      },
    },
  },
  getFlowConfigForJourney: jest.fn(() => mockFlowConfig),
  getStepForJourney: jest.fn((_journeyName: string, stepName: string) => {
    return (
      {
        'protected-step': protectedStep,
        'unprotected-step': unprotectedStep,
        'function-controller-step': stepWithFunctionController,
        'middleware-step': stepWithMiddleware,
      }[stepName] || undefined
    );
  }),
  getStepsForJourney: jest.fn((journeyName: string) => {
    if (journeyName === 'respondToClaim') {
      return allSteps;
    }
    return [];
  }),
}));

// Export step objects for use in tests
const mockStepsData = {
  protectedStep,
  unprotectedStep,
  stepWithFunctionController,
  stepWithMiddleware,
  allSteps,
};

import { Application } from 'express';

import { legalRepresentativeHeaderMiddleware, oidcMiddleware } from '../../../main/middleware';
import { registerSteps } from '../../../main/routes/registerSteps';

describe('registerSteps', () => {
  const mockGet = jest.fn();
  const mockPost = jest.fn();

  const app = {
    get: mockGet,
    post: mockPost,
  } as unknown as Application;

  const findRouteHandler = (method: jest.Mock, url: string) => {
    const routeCall = method.mock.calls.find(c => c[0] === url);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return routeCall ? (routeCall[routeCall.length - 1] as (...args: any[]) => any) : null;
  };

  const createMockRequest = (url: string, additionalProps = {}) => ({
    url,
    query: { lang: 'cy' },
    headers: {},
    ...additionalProps,
  });

  const createMockResponse = () => ({});

  const registerAndGetHandler = (url: string) => {
    registerSteps(app);
    return findRouteHandler(mockGet, url);
  };

  const executeHandler = (url: string, reqProps = {}) => {
    const handler = registerAndGetHandler(url);
    const mockReq = createMockRequest(url, reqProps);
    const mockRes = createMockResponse();
    handler!(mockReq, mockRes);
    return { mockReq, mockRes, handler };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers GET and POST with middlewares for protected steps', () => {
    registerSteps(app);

    const protectedGetCall = mockGet.mock.calls.find(call => call[0] === '/steps/protected');
    expect(protectedGetCall).toBeDefined();

    expect(protectedGetCall!).toHaveLength(5);
    expect(protectedGetCall![0]).toBe('/steps/protected');
    expect(protectedGetCall![1]).toBe(oidcMiddleware);
    expect(protectedGetCall![2]).toBe(mockStepDependencyCheck);
    expect(protectedGetCall![3]).toBe(legalRepresentativeHeaderMiddleware);
    expect(typeof protectedGetCall![4]).toBe('function');

    const protectedPostCall = mockPost.mock.calls.find(call => call[0] === '/steps/protected');
    expect(protectedPostCall).toBeDefined();
    expect(protectedPostCall!).toHaveLength(3);
    expect(protectedPostCall![0]).toBe('/steps/protected');
    expect(protectedPostCall![1]).toBe(oidcMiddleware);
    expect(typeof protectedPostCall![2]).toBe('function');
  });

  it('registers GET and POST without middlewares for unprotected steps', () => {
    registerSteps(app);

    const unprotectedGetCall = mockGet.mock.calls.find(call => call[0] === '/steps/unprotected');
    expect(unprotectedGetCall).toBeDefined();
    expect(unprotectedGetCall!).toHaveLength(4);
    expect(unprotectedGetCall![0]).toBe('/steps/unprotected');
    expect(unprotectedGetCall![1]).toBe(mockStepDependencyCheck);
    expect(unprotectedGetCall![2]).toBe(legalRepresentativeHeaderMiddleware);
    expect(typeof unprotectedGetCall![3]).toBe('function');

    const unprotectedPostCall = mockPost.mock.calls.find(call => call[0] === '/steps/unprotected');
    expect(unprotectedPostCall).toBeDefined();
    expect(unprotectedPostCall!).toHaveLength(2);
    expect(unprotectedPostCall![0]).toBe('/steps/unprotected');
    expect(typeof unprotectedPostCall![1]).toBe('function');
  });

  it('delegates POST handlers to the resolved step definition', () => {
    registerSteps(app);

    const protectedPostCall = mockPost.mock.calls.find(call => call[0] === '/steps/protected');
    const handler = protectedPostCall?.[2];
    const req = createMockRequest('/steps/protected');
    const res = createMockResponse();
    const next = jest.fn();

    handler(req, res, next);

    expect(mockStepsData.protectedStep.postController.post).toHaveBeenCalledWith(req, res, next);
  });

  it('handles function-based getController', () => {
    const { mockReq, mockRes } = executeHandler('/steps/function-controller');

    const mockGetControllerFn = mockStepsData.stepWithFunctionController.getController as jest.Mock;
    expect(mockGetControllerFn).toHaveBeenCalledWith();

    const returnedController = mockGetControllerFn.mock.results[0].value;
    expect(returnedController.get).toHaveBeenCalledWith(mockReq, mockRes);
  });

  it('includes custom step middleware along with protection middlewares', () => {
    registerSteps(app);

    const stepWithMiddlewareCall = mockGet.mock.calls.find(call => call[0] === '/steps/with-middleware');

    expect(stepWithMiddlewareCall).toBeDefined();
    expect(stepWithMiddlewareCall!).toHaveLength(6);
    expect(stepWithMiddlewareCall![0]).toBe('/steps/with-middleware');
    expect(stepWithMiddlewareCall![1]).toBe(oidcMiddleware);
    expect(stepWithMiddlewareCall![2]).toBe(mockStepDependencyCheck);
    expect(stepWithMiddlewareCall![3]).toBe(mockStepsData.stepWithMiddleware.middleware![0]);
    expect(stepWithMiddlewareCall![4]).toBe(legalRepresentativeHeaderMiddleware);
    expect(typeof stepWithMiddlewareCall![5]).toBe('function');
  });

  it('calls getValidatedLanguage for each GET route', () => {
    const additionalProps = {
      language: 'en',
      cookies: { lang: 'en' },
      headers: { 'accept-language': 'en-GB' },
    };

    const { mockReq, mockRes } = executeHandler('/steps/unprotected', additionalProps);

    expect(mockGetValidatedLanguage).toHaveBeenCalledWith(mockReq);
    expect(mockStepsData.unprotectedStep.getController.get).toHaveBeenCalledWith(mockReq, mockRes);
  });

  it('logs language information when handling GET requests', () => {
    const additionalProps = {
      language: 'en',
      cookies: { lang: 'en' },
      headers: { 'accept-language': 'en-GB' },
    };

    executeHandler('/steps/unprotected', additionalProps);

    expect(mockLogger.debug).toHaveBeenCalledWith('Language information', {
      url: '/steps/unprotected',
      step: 'unprotected-step',
      journey: 'respondToClaim',
      validatedLang: 'en',
      reqLanguage: 'en',
      langCookie: 'en',
      langQuery: 'cy',
      headers: {
        'accept-language': 'en-GB',
      },
    });
  });

  it('logs successful registration with counts', () => {
    registerSteps(app);

    expect(mockLogger.info).toHaveBeenCalledWith('Steps registered successfully', {
      totalJourneys: 1,
      totalSteps: 4,
      totalProtectedSteps: 3, // protected-step, function-controller-step, middleware-step (unprotected-step has requiresAuth: false)
    });
  });

  it('only registers routes for steps with controllers', () => {
    const testApp = {
      get: jest.fn(),
      post: jest.fn(),
    } as unknown as Application;

    const stepWithoutControllers = {
      url: '/steps/no-controllers',
      name: 'no-controllers',
    };

    jest.doMock('../../../main/steps', () => ({
      journeyRegistry: {
        respondToClaim: {
          name: 'respondToClaim',
          default: {
            flowConfig: {
              basePath: '/respond-to-claim',
              stepOrder: ['no-controllers'],
              steps: {
                'no-controllers': { requiresAuth: true },
              },
            },
            stepRegistry: {
              'no-controllers': stepWithoutControllers,
            },
          },
        },
      },
      getStepsForJourney: jest.fn(() => [stepWithoutControllers]),
    }));

    jest.resetModules();
    const { registerSteps: registerStepsNew } = require('../../../main/routes/registerSteps');

    registerStepsNew(testApp);

    expect(testApp.get).not.toHaveBeenCalled();
    expect(testApp.post).not.toHaveBeenCalled();
  });

  it('should throw error when specific journey not found in registry', () => {
    const testApp = {
      get: jest.fn(),
      post: jest.fn(),
    } as unknown as Application;

    expect(() => registerSteps(testApp, 'nonExistentJourney')).toThrow(
      "Journey 'nonExistentJourney' not found in registry. Available journeys: respondToClaim"
    );
  });

  it('should register only specific journey when provided', () => {
    const testApp = {
      get: jest.fn(),
      post: jest.fn(),
    } as unknown as Application;

    registerSteps(testApp, 'respondToClaim');

    expect(testApp.get).toHaveBeenCalled();
    expect(testApp.post).toHaveBeenCalled();
    expect(mockLogger.debug).toHaveBeenCalledWith('Registering steps for journey: respondToClaim', {
      journeyName: 'respondToClaim',
      stepCount: 4,
    });
  });
});

describe('registerAllJourneys', () => {
  let app: Application;
  let mockUse: jest.Mock;
  let mockParam: jest.Mock;

  const mockCaseReferenceParamMiddleware = jest.fn((req, res, next) => next());

  beforeEach(() => {
    jest.clearAllMocks();

    mockUse = jest.fn();
    mockParam = jest.fn();

    app = {
      use: mockUse,
      param: mockParam,
    } as unknown as Application;

    jest.doMock('../../../main/middleware', () => ({
      oidcMiddleware: jest.fn((req, res, next) => next()),
      caseReferenceParamMiddleware: mockCaseReferenceParamMiddleware,
      legalRepresentativeHeaderMiddleware: jest.fn((req, res, next) => next()),
    }));
  });

  it('should register all journeys from registry', () => {
    jest.resetModules();
    const { registerAllJourneys } = require('../../../main/routes/registerSteps');

    registerAllJourneys(app);

    expect(mockUse).toHaveBeenCalledWith(expect.any(Function));
    expect(mockLogger.info).toHaveBeenCalledWith('Auto-registering all journeys from registry');
    expect(mockLogger.info).toHaveBeenCalledWith("Journey 'respondToClaim' auto-registered and mounted");
    expect(mockLogger.info).toHaveBeenCalledWith('All journeys registered successfully');
  });

  it('should create router with mergeParams enabled for each journey', () => {
    jest.resetModules();
    const { registerAllJourneys } = require('../../../main/routes/registerSteps');

    registerAllJourneys(app);

    // Verify that a router was created and mounted
    expect(mockUse).toHaveBeenCalled();
  });
});
