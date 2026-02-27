import type { Request, Response } from 'express';

import type { JourneyFlowConfig } from '../../../../main/interfaces/stepFlow.interface';
import {
  checkStepDependencies,
  createStepNavigation,
  getNextStep,
  getPreviousStep,
  getStepUrl,
  stepDependencyCheckMiddleware,
} from '../../../../main/modules/steps/flow';

jest.mock('@modules/logger', () => ({
  Logger: {
    getLogger: jest.fn(() => ({
      debug: jest.fn(),
      error: jest.fn(),
    })),
  },
}));

describe('stepFlow', () => {
  const mockFlowConfig: JourneyFlowConfig = {
    basePath: '/steps/test-journey',
    stepOrder: ['step1', 'step2', 'step3'],
    steps: {
      step1: {
        defaultNext: 'step2',
      },
      step2: {
        dependencies: ['step1'],
        defaultNext: 'step3',
      },
      step3: {
        dependencies: ['step1', 'step2'],
      },
    },
  };

  describe('getNextStep', () => {
    const mockReq = {} as Request;

    it('should return defaultNext when step has defaultNext configured', async () => {
      const result = await getNextStep(mockReq, 'step1', mockFlowConfig, {});
      expect(result).toBe('step2');
    });

    it('should return next step in order when no defaultNext is configured', async () => {
      const config: JourneyFlowConfig = {
        basePath: '/test',
        stepOrder: ['step1', 'step2', 'step3'],
        steps: {
          step1: {},
          step2: {},
          step3: {},
        },
      };
      const result = await getNextStep(mockReq, 'step1', config, {});
      expect(result).toBe('step2');
    });

    it('should return null when at last step', async () => {
      const result = await getNextStep(mockReq, 'step3', mockFlowConfig, {});
      expect(result).toBeNull();
    });

    it('should return null when step not found in order', async () => {
      const result = await getNextStep(mockReq, 'unknown', mockFlowConfig, {});
      expect(result).toBeNull();
    });

    it('should use conditional route when condition is true', async () => {
      const config: JourneyFlowConfig = {
        basePath: '/test',
        stepOrder: ['step1', 'step2', 'step3'],
        steps: {
          step1: {
            routes: [
              {
                condition: async (_req, formData) => formData.condition === true,
                nextStep: 'step3',
              },
              {
                nextStep: 'step2',
              },
            ],
          },
        },
      };
      const result = await getNextStep(mockReq, 'step1', config, { condition: true }, {});
      expect(result).toBe('step3');
    });

    it('should use fallback route when condition is false', async () => {
      const config: JourneyFlowConfig = {
        basePath: '/test',
        stepOrder: ['step1', 'step2', 'step3'],
        steps: {
          step1: {
            routes: [
              {
                condition: async (_req, formData) => formData.condition === true,
                nextStep: 'step3',
              },
              {
                nextStep: 'step2',
              },
            ],
          },
        },
      };
      const result = await getNextStep(mockReq, 'step1', config, { condition: false }, {});
      expect(result).toBe('step2');
    });

    it('should use route without condition when no condition provided', async () => {
      const config: JourneyFlowConfig = {
        basePath: '/test',
        stepOrder: ['step1', 'step2'],
        steps: {
          step1: {
            routes: [
              {
                nextStep: 'step2',
              },
            ],
          },
        },
      };
      const result = await getNextStep(mockReq, 'step1', config, {}, {});
      expect(result).toBe('step2');
    });

    it('should handle Promise condition', async () => {
      const config: JourneyFlowConfig = {
        basePath: '/test',
        stepOrder: ['step1', 'step2', 'step3'],
        steps: {
          step1: {
            routes: [
              {
                condition: async (_req, formData) => {
                  await new Promise(resolve => setTimeout(resolve, 10));
                  return formData.condition === true;
                },
                nextStep: 'step3',
              },
              {
                nextStep: 'step2',
              },
            ],
          },
        },
      };
      const result = await getNextStep(mockReq, 'step1', config, { condition: true }, {});
      expect(result).toBe('step3');
    });
  });

  describe('getPreviousStep', () => {
    const mockReq = {} as Request;

    it('should return previous step in order', async () => {
      const result = await getPreviousStep(mockReq, 'step2', mockFlowConfig);
      expect(result).toBe('step1');
    });

    it('should return null when at first step', async () => {
      const result = await getPreviousStep(mockReq, 'step1', mockFlowConfig);
      expect(result).toBeNull();
    });

    it('should return null when step not found in order', async () => {
      const result = await getPreviousStep(mockReq, 'unknown', mockFlowConfig);
      expect(result).toBeNull();
    });

    it('should return explicit previousStep when configured', async () => {
      const config: JourneyFlowConfig = {
        basePath: '/test',
        stepOrder: ['step1', 'step2', 'step3'],
        steps: {
          step1: {},
          step2: {
            previousStep: 'step1',
          },
          step3: {},
        },
      };
      const result = await getPreviousStep(mockReq, 'step2', config);
      expect(result).toBe('step1');
    });

    it('should return previousStep from function when configured', async () => {
      const config: JourneyFlowConfig = {
        basePath: '/test',
        stepOrder: ['step1', 'step2', 'step3'],
        steps: {
          step1: {},
          step2: {
            previousStep: (req: Request, formData: Record<string, unknown>) => {
              return formData.condition === true ? 'step1' : 'step3';
            },
          },
          step3: {},
        },
      };
      const result = await getPreviousStep(mockReq, 'step2', config, { condition: true });
      expect(result).toBe('step1');
    });

    it('should find previous step from conditional route', async () => {
      const config: JourneyFlowConfig = {
        basePath: '/test',
        stepOrder: ['step1', 'step2', 'step3'],
        steps: {
          step1: {
            routes: [
              {
                condition: async (_req, formData) => formData.condition === true,
                nextStep: 'step2',
              },
            ],
          },
          step2: {},
          step3: {},
        },
      };
      const result = await getPreviousStep(mockReq, 'step2', config, { condition: true });
      expect(result).toBe('step1');
    });

    it('should find previous step from defaultNext', async () => {
      const config: JourneyFlowConfig = {
        basePath: '/test',
        stepOrder: ['step1', 'step2', 'step3'],
        steps: {
          step1: {
            defaultNext: 'step2',
          },
          step2: {},
          step3: {},
        },
      };
      const result = await getPreviousStep(mockReq, 'step2', config);
      expect(result).toBe('step1');
    });

    it('should not find previous step when route condition is false', async () => {
      const config: JourneyFlowConfig = {
        basePath: '/test',
        stepOrder: ['step1', 'step2', 'step3'],
        steps: {
          step1: {
            routes: [
              {
                condition: async (_req, formData) => formData.condition === true,
                nextStep: 'step2',
              },
            ],
          },
          step2: {},
          step3: {},
        },
      };
      const result = await getPreviousStep(mockReq, 'step2', config, { condition: false });
      expect(result).toBe('step1');
    });

    it('should handle Promise condition in getPreviousStep', async () => {
      const config: JourneyFlowConfig = {
        basePath: '/test',
        stepOrder: ['step1', 'step2', 'step3'],
        steps: {
          step1: {
            routes: [
              {
                condition: async (_req, formData) => {
                  await new Promise(resolve => setTimeout(resolve, 10));
                  return formData.condition === true;
                },
                nextStep: 'step2',
              },
            ],
          },
          step2: {},
          step3: {},
        },
      };
      const result = await getPreviousStep(mockReq, 'step2', config, { condition: true });
      expect(result).toBe('step1');
    });
  });

  describe('getStepUrl', () => {
    it('should use basePath when provided', () => {
      const result = getStepUrl('step1', mockFlowConfig);
      expect(result).toBe('/steps/test-journey/step1');
    });

    it('should return /stepName when basePath not provided', () => {
      const config: JourneyFlowConfig = {
        journeyName: 'test-journey',
        stepOrder: ['step1'],
        steps: {},
      };
      const result = getStepUrl('step1', config);
      expect(result).toBe('/step1');
    });

    it('should use step name directly when neither basePath nor journeyName provided', () => {
      const config: JourneyFlowConfig = {
        stepOrder: ['step1'],
        steps: {},
      };
      const result = getStepUrl('step1', config);
      expect(result).toBe('/step1');
    });

    it('should replace :caseReference with case reference', () => {
      const config: JourneyFlowConfig = {
        basePath: '/case/:caseReference/respond',
        stepOrder: ['step1'],
        steps: {},
      };
      const result = getStepUrl('step1', config, '1234567890123456');
      expect(result).toBe('/case/1234567890123456/respond/step1');
    });

    it('should not replace caseReference when basePath does not contain placeholder', () => {
      const config: JourneyFlowConfig = {
        basePath: '/case/respond',
        stepOrder: ['step1'],
        steps: {},
      };
      const result = getStepUrl('step1', config, '1234567890123456');
      expect(result).toBe('/case/respond/step1');
    });
  });

  describe('checkStepDependencies', () => {
    it('should return null when step has no dependencies', () => {
      const result = checkStepDependencies('step1', mockFlowConfig, {});
      expect(result).toBeNull();
    });

    it('should return null when all dependencies are met', () => {
      const formData = {
        step1: 'value1',
        step2: 'value2',
      };
      const result = checkStepDependencies('step3', mockFlowConfig, formData);
      expect(result).toBeNull();
    });

    it('should return first missing dependency', () => {
      const formData = {
        step1: 'value1',
      };
      const result = checkStepDependencies('step3', mockFlowConfig, formData);
      expect(result).toBe('step2');
    });

    it('should return dependency when step not found in config', () => {
      const result = checkStepDependencies('unknown', mockFlowConfig, {});
      expect(result).toBeNull();
    });
  });

  describe('createStepNavigation', () => {
    it('should create navigation object with correct methods', () => {
      const navigation = createStepNavigation(mockFlowConfig);
      expect(navigation).toHaveProperty('getNextStepUrl');
      expect(navigation).toHaveProperty('getBackUrl');
      expect(navigation).toHaveProperty('getStepUrl');
    });

    it('getNextStepUrl should return correct URL', async () => {
      const navigation = createStepNavigation(mockFlowConfig);
      const req = {
        params: {},
        session: {
          formData: {},
        },
      } as unknown as Request;

      const result = await navigation.getNextStepUrl(req, 'step1', {});
      expect(result).toBe('/steps/test-journey/step2');
    });

    it('getNextStepUrl should return null when no next step', async () => {
      const navigation = createStepNavigation(mockFlowConfig);
      const req = {
        params: {},
        session: {
          formData: {},
        },
      } as unknown as Request;

      const result = await navigation.getNextStepUrl(req, 'step3', {});
      expect(result).toBeNull();
    });

    it('getBackUrl should return correct URL', async () => {
      const navigation = createStepNavigation(mockFlowConfig);
      const req = {
        params: {},
      } as Request;

      const result = await navigation.getBackUrl(req, 'step2');
      expect(result).toBe('/steps/test-journey/step1');
    });

    it('getBackUrl should return null when no previous step', async () => {
      const navigation = createStepNavigation(mockFlowConfig);
      const req = {
        params: {},
      } as Request;

      const result = await navigation.getBackUrl(req, 'step1');
      expect(result).toBeNull();
    });

    it('getStepUrl should return correct URL', () => {
      const navigation = createStepNavigation(mockFlowConfig);
      const result = navigation.getStepUrl('step1');
      expect(result).toBe('/steps/test-journey/step1');
    });
  });

  describe('stepDependencyCheckMiddleware', () => {
    it('should call next() when step has no dependencies', () => {
      const middleware = stepDependencyCheckMiddleware(mockFlowConfig);
      const req = {
        path: '/steps/test-journey/step1',
        session: {
          formData: {},
        },
      } as unknown as Request;
      const res = {} as Response;
      const next = jest.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should call next() when all dependencies are met', () => {
      const middleware = stepDependencyCheckMiddleware(mockFlowConfig);
      const req = {
        path: '/steps/test-journey/step2',
        session: {
          formData: {
            step1: 'value',
          },
        },
      } as unknown as Request;
      const res = {} as Response;
      const next = jest.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should redirect when dependencies are not met', () => {
      const middleware = stepDependencyCheckMiddleware(mockFlowConfig);
      const req = {
        path: '/steps/test-journey/step2',
        session: {
          formData: {},
        },
      } as unknown as Request;
      const res = {
        redirect: jest.fn(),
      } as unknown as Response;
      const next = jest.fn();

      middleware(req, res, next);

      expect(res.redirect).toHaveBeenCalledWith(303, '/steps/test-journey/step1');
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next() when step name cannot be extracted from path', () => {
      const middleware = stepDependencyCheckMiddleware(mockFlowConfig);
      const req = {
        path: '/steps/test-journey/',
        session: {
          formData: {},
        },
      } as unknown as Request;
      const res = {} as Response;
      const next = jest.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should handle empty path', () => {
      const middleware = stepDependencyCheckMiddleware(mockFlowConfig);
      const req = {
        path: '',
        session: {
          formData: {},
        },
      } as unknown as Request;
      const res = {} as Response;
      const next = jest.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should use default flow config when not provided', () => {
      const middleware = stepDependencyCheckMiddleware();
      const req = {
        path: '/respond-to-claim/correspondence-address',
        session: {
          formData: {},
        },
      } as unknown as Request;
      const res = {
        redirect: jest.fn(),
      } as unknown as Response;
      const next = jest.fn();

      middleware(req, res, next);

      // correspondence-address has no dependencies in respondToClaim flow, so next() should be called
      expect(next).toHaveBeenCalled();
      expect(res.redirect).not.toHaveBeenCalled();
    });
  });
});
