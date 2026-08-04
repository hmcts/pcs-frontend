import type { Request, Response } from 'express';

import {
  checkStepDependencies,
  createStepNavigation,
  getNextStep,
  getPreviousStep,
  getStepUrl,
  stepDependencyCheckMiddleware,
} from '@modules/steps/flow';
import type { JourneyFlowConfig } from '@modules/steps/stepFlow.interface';

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

  describe('getNextStep with show conditions', () => {
    const mockReq = {} as Request;

    it('should return next page with missing show condition', async () => {
      const flowConfig: JourneyFlowConfig = {
        useShowConditions: true,
        stepOrder: ['step1', 'step2', 'step3'],
        steps: {
          step2: {
            showCondition: _req => false,
          },
          // step3 has no showCondition defined
        },
      };

      const result = await getNextStep(mockReq, 'step1', flowConfig, {});
      expect(result).toBe('step3');
    });

    it('should return next visible page with show condition', async () => {
      const flowConfig: JourneyFlowConfig = {
        useShowConditions: true,
        stepOrder: ['step1', 'step2', 'step3'],
        steps: {
          step2: {
            showCondition: _req => false,
          },
          step3: {
            showCondition: _req => true,
          },
        },
      };

      const result = await getNextStep(mockReq, 'step1', flowConfig, {});
      expect(result).toBe('step3');
    });

    it('should return null when no further visible pages', async () => {
      const flowConfig: JourneyFlowConfig = {
        useShowConditions: true,
        stepOrder: ['step1', 'step2', 'step3'],
        steps: {
          step2: {
            showCondition: _req => false,
          },
          step3: {
            showCondition: _req => false,
          },
        },
      };

      const result = await getNextStep(mockReq, 'step1', flowConfig, {});
      expect(result).toBe(null);
    });

    it('should throw errorfor unknown step name', async () => {
      const flowConfig: JourneyFlowConfig = {
        useShowConditions: true,
        stepOrder: ['step1', 'step2', 'step3'],
        steps: {
          step2: {
            showCondition: _req => false,
          },
        },
      };

      await expect(getNextStep(mockReq, 'step99', flowConfig, {})).rejects.toThrow(
        'Step step99 not found in stepOrder'
      );
    });

    it('should derive order from sections when stepOrder is not provided', async () => {
      const flowConfig: JourneyFlowConfig = {
        useShowConditions: true,
        sections: [
          {
            id: 'sectionA',
            titleKey: 'sectionA',
            steps: ['step1', 'step2'],
          },
        ],
        nonSectionStepOrder: ['end-now'],
        steps: {
          step2: {
            showCondition: _req => true,
          },
        },
      };

      await expect(getNextStep(mockReq, 'step2', flowConfig, {})).resolves.toBe('end-now');
    });
  });

  describe('getNextStep with section-first navigation', () => {
    const mockReq = {} as Request;

    it('skips a whole section whose isApplicable resolves false', async () => {
      const flowConfig: JourneyFlowConfig = {
        useShowConditions: true,
        sections: [
          { id: 'a', titleKey: 'a', steps: ['step-a1'] },
          { id: 'b', titleKey: 'b', steps: ['step-b1', 'step-b2'], isApplicable: async () => false },
          { id: 'c', titleKey: 'c', steps: ['step-c1'] },
        ],
        steps: {},
      };

      await expect(getNextStep(mockReq, 'step-a1', flowConfig, {})).resolves.toBe('step-c1');
    });

    it('walks remaining steps within the current section before moving to the next section', async () => {
      const flowConfig: JourneyFlowConfig = {
        useShowConditions: true,
        sections: [
          { id: 'a', titleKey: 'a', steps: ['step-a1', 'step-a2', 'step-a3'] },
          { id: 'b', titleKey: 'b', steps: ['step-b1'] },
        ],
        steps: {
          'step-a2': { showCondition: _req => false },
        },
      };

      await expect(getNextStep(mockReq, 'step-a1', flowConfig, {})).resolves.toBe('step-a3');
    });

    it('falls through to nonSectionStepOrder once all subsequent sections are exhausted', async () => {
      const flowConfig: JourneyFlowConfig = {
        useShowConditions: true,
        sections: [
          { id: 'a', titleKey: 'a', steps: ['step-a1'] },
          { id: 'b', titleKey: 'b', steps: ['step-b1'], isApplicable: async () => false },
        ],
        nonSectionStepOrder: ['end-now'],
        steps: {},
      };

      await expect(getNextStep(mockReq, 'step-a1', flowConfig, {})).resolves.toBe('end-now');
    });

    it('passes req to section.isApplicable', async () => {
      const isApplicable = jest.fn().mockResolvedValue(false);
      const flowConfig: JourneyFlowConfig = {
        useShowConditions: true,
        sections: [
          { id: 'a', titleKey: 'a', steps: ['step-a1'] },
          { id: 'b', titleKey: 'b', steps: ['step-b1'], isApplicable },
        ],
        nonSectionStepOrder: ['end-now'],
        steps: {},
      };

      await expect(getNextStep(mockReq, 'step-a1', flowConfig, {})).resolves.toBe('end-now');
      expect(isApplicable).toHaveBeenCalledWith(mockReq);
    });

    it('still applies showCondition within an applicable section', async () => {
      const flowConfig: JourneyFlowConfig = {
        useShowConditions: true,
        sections: [
          { id: 'a', titleKey: 'a', steps: ['step-a1'] },
          { id: 'b', titleKey: 'b', steps: ['step-b1', 'step-b2'] },
        ],
        steps: {
          'step-b1': { showCondition: _req => false },
          'step-b2': { showCondition: _req => true },
        },
      };

      await expect(getNextStep(mockReq, 'step-a1', flowConfig, {})).resolves.toBe('step-b2');
    });

    it('throws when current step is not in any section or nonSectionStepOrder', async () => {
      const flowConfig: JourneyFlowConfig = {
        useShowConditions: true,
        sections: [{ id: 'a', titleKey: 'a', steps: ['step-a1'] }],
        steps: {},
      };

      await expect(getNextStep(mockReq, 'unknown', flowConfig, {})).rejects.toThrow(
        'Step unknown not found in stepOrder'
      );
    });

    it('prefers stepOrder over sections when both are present (flat dispatch wins)', async () => {
      const flowConfig: JourneyFlowConfig = {
        useShowConditions: true,
        stepOrder: ['s1', 's2'],
        sections: [{ id: 'a', titleKey: 'a', steps: ['s1', 'foreign-section-step'] }],
        steps: {},
      };

      await expect(getNextStep(mockReq, 's1', flowConfig, {})).resolves.toBe('s2');
    });
  });

  describe('getNextStep without show conditions', () => {
    const mockReq = {} as Request;

    it('should throw when neither stepOrder nor sections are configured', async () => {
      const config: JourneyFlowConfig = {
        basePath: '/test',
        steps: {
          step1: {},
        },
      };

      await expect(getNextStep(mockReq, 'step1', config, {})).rejects.toThrow(
        'JourneyFlowConfig requires stepOrder when sections are not configured'
      );
    });

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

    it('should fallback to step order when route conditions do not match and no defaultNext', async () => {
      const config: JourneyFlowConfig = {
        basePath: '/test',
        stepOrder: ['step1', 'step2', 'step3'],
        steps: {
          step1: {
            routes: [
              {
                condition: async () => false,
                nextStep: 'step3',
              },
            ],
          },
          step2: {},
          step3: {},
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

  describe('getPreviousStep with show conditions', () => {
    const mockReq = {} as Request;

    it('should return previous page with missing show condition', async () => {
      const flowConfig: JourneyFlowConfig = {
        useShowConditions: true,
        stepOrder: ['step1', 'step2', 'step3'],
        steps: {
          step2: {
            showCondition: _req => false,
          },
          // step3 has no showCondition defined
        },
      };

      const result = await getPreviousStep(mockReq, 'step3', flowConfig, {});
      expect(result).toBe('step1');
    });

    it('should return previous visible page with show condition', async () => {
      const flowConfig: JourneyFlowConfig = {
        useShowConditions: true,
        stepOrder: ['step1', 'step2', 'step3'],
        steps: {
          step1: {
            showCondition: _req => true,
          },
          step2: {
            showCondition: _req => false,
          },
        },
      };

      const result = await getPreviousStep(mockReq, 'step3', flowConfig, {});
      expect(result).toBe('step1');
    });

    it('should return null when no earlier visible pages', async () => {
      const flowConfig: JourneyFlowConfig = {
        useShowConditions: true,
        stepOrder: ['step1', 'step2', 'step3'],
        steps: {
          step1: {
            showCondition: _req => false,
          },
          step2: {
            showCondition: _req => false,
          },
        },
      };

      const result = await getPreviousStep(mockReq, 'step3', flowConfig, {});
      expect(result).toBe(null);
    });

    it('should return null when back navigation prevented for current step', async () => {
      const flowConfig: JourneyFlowConfig = {
        useShowConditions: true,
        stepOrder: ['step1', 'step2', 'step3'],
        steps: {
          step3: {
            preventBack: true,
          },
        },
      };

      const result = await getPreviousStep(mockReq, 'step3', flowConfig, {});
      expect(result).toBe(null);
    });

    it('should return previous step even when that is prevented from further back navigation', async () => {
      const flowConfig: JourneyFlowConfig = {
        useShowConditions: true,
        stepOrder: ['step1', 'step2', 'step3'],
        steps: {
          step2: {
            preventBack: true,
          },
        },
      };

      const result = await getPreviousStep(mockReq, 'step3', flowConfig, {});
      expect(result).toBe('step2');
    });

    it('should ignore preventBack flag for hidden steps', async () => {
      const flowConfig: JourneyFlowConfig = {
        useShowConditions: true,
        stepOrder: ['step1', 'step2', 'step3'],
        steps: {
          step2: {
            showCondition: _req => false,
            preventBack: true,
          },
        },
      };

      const result = await getPreviousStep(mockReq, 'step3', flowConfig, {});
      expect(result).toBe('step1');
    });

    it('should throw error for unknown step name', async () => {
      const flowConfig: JourneyFlowConfig = {
        useShowConditions: true,
        stepOrder: ['step1', 'step2', 'step3'],
        steps: {
          step2: {
            showCondition: _req => false,
          },
        },
      };

      await expect(getPreviousStep(mockReq, 'step99', flowConfig, {})).rejects.toThrow(
        'Step step99 not found in stepOrder'
      );
    });
  });

  describe('getPreviousStep with section-first navigation', () => {
    const mockReq = {} as Request;

    it('skips back through sections whose isApplicable resolves false', async () => {
      const flowConfig: JourneyFlowConfig = {
        useShowConditions: true,
        sections: [
          { id: 'a', titleKey: 'a', steps: ['step-a1'] },
          { id: 'b', titleKey: 'b', steps: ['step-b1'], isApplicable: async () => false },
          { id: 'c', titleKey: 'c', steps: ['step-c1'] },
        ],
        steps: {},
      };

      await expect(getPreviousStep(mockReq, 'step-c1', flowConfig, {})).resolves.toBe('step-a1');
    });

    it('walks earlier steps within the current section before crossing into a previous section', async () => {
      const flowConfig: JourneyFlowConfig = {
        useShowConditions: true,
        sections: [
          { id: 'a', titleKey: 'a', steps: ['step-a1'] },
          { id: 'b', titleKey: 'b', steps: ['step-b1', 'step-b2', 'step-b3'] },
        ],
        steps: {
          'step-b2': { showCondition: _req => false },
        },
      };

      await expect(getPreviousStep(mockReq, 'step-b3', flowConfig, {})).resolves.toBe('step-b1');
    });

    it('returns null when no earlier visible step exists', async () => {
      const flowConfig: JourneyFlowConfig = {
        useShowConditions: true,
        sections: [{ id: 'a', titleKey: 'a', steps: ['step-a1'], isApplicable: async () => false }],
        nonSectionStepOrder: ['end-now'],
        steps: {},
      };

      await expect(getPreviousStep(mockReq, 'end-now', flowConfig, {})).resolves.toBeNull();
    });

    it('respects preventBack on the current step', async () => {
      const flowConfig: JourneyFlowConfig = {
        useShowConditions: true,
        sections: [{ id: 'a', titleKey: 'a', steps: ['step-a1', 'step-a2'] }],
        steps: {
          'step-a2': { preventBack: true },
        },
      };

      await expect(getPreviousStep(mockReq, 'step-a2', flowConfig, {})).resolves.toBeNull();
    });

    it('returns hubStepName for the first visible step of a section when hub-and-spoke is opted in', async () => {
      const flowConfig: JourneyFlowConfig = {
        useShowConditions: true,
        sections: [
          { id: 'a', titleKey: 'a', steps: ['step-a1', 'step-a2'] },
          { id: 'b', titleKey: 'b', steps: ['step-b1', 'step-b2'] },
        ],
        nonSectionStepOrder: ['hub'],
        hubStepName: 'hub',
        steps: {},
      };

      // First step of section b → hub (not last step of section a).
      await expect(getPreviousStep(mockReq, 'step-b1', flowConfig, {})).resolves.toBe('hub');
      // First step of the very first section also → hub.
      await expect(getPreviousStep(mockReq, 'step-a1', flowConfig, {})).resolves.toBe('hub');
      // Mid-section back navigation unaffected.
      await expect(getPreviousStep(mockReq, 'step-b2', flowConfig, {})).resolves.toBe('step-b1');
    });

    it('ignores hubStepName when the referenced step is not in nonSectionStepOrder', async () => {
      const flowConfig: JourneyFlowConfig = {
        useShowConditions: true,
        sections: [
          { id: 'a', titleKey: 'a', steps: ['step-a1'] },
          { id: 'b', titleKey: 'b', steps: ['step-b1'] },
        ],
        hubStepName: 'missing-hub',
        steps: {},
      };

      // Falls back to cross-section walk because the hub isn't registered.
      await expect(getPreviousStep(mockReq, 'step-b1', flowConfig, {})).resolves.toBe('step-a1');
    });
  });

  describe('getPreviousStep without show conditions', () => {
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

    it('should find previous step from route without condition', async () => {
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
          step2: {},
        },
      };

      const result = await getPreviousStep(mockReq, 'step2', config);
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

      const result = await navigation.getNextStepUrl(req, 'step1');
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

      const result = await navigation.getNextStepUrl(req, 'step3');
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

    it('getStepUrl should throw when config is provided as resolver function', () => {
      const resolver = async () => mockFlowConfig;
      const navigation = createStepNavigation(resolver);

      expect(() => navigation.getStepUrl('step1')).toThrow(
        'getStepUrl requires a static JourneyFlowConfig when a resolver is used'
      );
    });

    it('resolver navigation should resolve next and back urls', async () => {
      const resolver = async () => mockFlowConfig;
      const navigation = createStepNavigation(resolver);
      const req = {
        params: {},
        session: {
          formData: {},
        },
      } as unknown as Request;

      await expect(navigation.getNextStepUrl(req, 'step1')).resolves.toBe('/steps/test-journey/step2');
      await expect(navigation.getBackUrl(req, 'step2')).resolves.toBe('/steps/test-journey/step1');
    });
  });

  describe('stepDependencyCheckMiddleware', () => {
    it('should call next() when step has no dependencies', async () => {
      const middleware = stepDependencyCheckMiddleware(mockFlowConfig);
      const req = {
        path: '/steps/test-journey/step1',
        session: {
          formData: {},
        },
      } as unknown as Request;
      const res = {} as Response;
      const next = jest.fn();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should call next() when all dependencies are met', async () => {
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

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should redirect when dependencies are not met', async () => {
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

      await middleware(req, res, next);

      expect(res.redirect).toHaveBeenCalledWith(303, '/steps/test-journey/step1');
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next() when step name cannot be extracted from path', async () => {
      const middleware = stepDependencyCheckMiddleware(mockFlowConfig);
      const req = {
        path: '/steps/test-journey/',
        session: {
          formData: {},
        },
      } as unknown as Request;
      const res = {} as Response;
      const next = jest.fn();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should handle empty path', async () => {
      const middleware = stepDependencyCheckMiddleware(mockFlowConfig);
      const req = {
        path: '',
        session: {
          formData: {},
        },
      } as unknown as Request;
      const res = {} as Response;
      const next = jest.fn();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });
});
