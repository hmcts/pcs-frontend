import type { Request } from 'express';

import type { JourneyFlowConfig } from '../../../../main/interfaces/stepFlow.interface';
import { getPreviousStep } from '../../../../main/modules/steps/flow';

describe('getPreviousStep Algorithm', () => {
  const mockReq = {
    res: {
      locals: {
        validatedCase: {
          data: {},
        },
      },
    },
  } as unknown as Request;

  describe('Explicit previousStep (string)', () => {
    it('should return explicit previousStep when defined as string', async () => {
      const testConfig: JourneyFlowConfig = {
        basePath: '/test',
        stepOrder: ['step-a', 'step-b'],
        steps: {
          'step-a': {
            previousStep: 'step-b',
          },
        },
      };

      const result = await getPreviousStep(mockReq, 'step-a', testConfig, {});

      expect(result).toBe('step-b');
    });
  });

  describe('Function-based previousStep', () => {
    it('should call previousStep function with req and formData', async () => {
      const mockPreviousStepFn = jest.fn().mockResolvedValue('calculated-step');

      const testConfig: JourneyFlowConfig = {
        basePath: '/test',
        stepOrder: ['step-a', 'calculated-step'],
        steps: {
          'step-a': {
            previousStep: mockPreviousStepFn,
          },
        },
      };

      const formData = { someData: 'value' };
      const result = await getPreviousStep(mockReq, 'step-a', testConfig, formData);

      expect(mockPreviousStepFn).toHaveBeenCalledWith(mockReq, formData);
      expect(result).toBe('calculated-step');
    });

    it('should use formData to determine which step user visited', async () => {
      const previousStepFn = async (_req: Request, formData: Record<string, unknown>) => {
        if ('step-b' in formData) {
          return 'step-b';
        }
        return 'step-c';
      };

      const testConfig: JourneyFlowConfig = {
        basePath: '/test',
        stepOrder: ['step-a', 'step-b', 'step-c'],
        steps: {
          'step-a': {
            previousStep: previousStepFn,
          },
        },
      };

      const formDataWithB = { 'step-b': { visited: true } };
      const resultB = await getPreviousStep(mockReq, 'step-a', testConfig, formDataWithB);
      expect(resultB).toBe('step-b');

      const formDataWithoutB = {};
      const resultC = await getPreviousStep(mockReq, 'step-a', testConfig, formDataWithoutB);
      expect(resultC).toBe('step-c');
    });
  });

  describe('Auto-calculated previousStep (from routes)', () => {
    it('should find previous step from routes with unconditional route', async () => {
      const testConfig: JourneyFlowConfig = {
        basePath: '/test',
        stepOrder: ['step-a', 'step-b', 'current-step'],
        steps: {
          'step-a': {
            routes: [{ nextStep: 'current-step' }],
          },
          'step-b': {
            routes: [{ nextStep: 'other-step' }],
          },
          'current-step': {},
        },
      };

      // Algorithm finds first step with route to current-step (step-a)
      const result = await getPreviousStep(mockReq, 'current-step', testConfig, {});

      expect(result).toBe('step-a');
    });

    it('should check conditional routes and use first that routes to current step', async () => {
      const testConfig: JourneyFlowConfig = {
        basePath: '/test',
        stepOrder: ['step-a', 'step-b', 'current-step'],
        steps: {
          'step-a': {
            routes: [
              { condition: async () => true, nextStep: 'current-step' },
              { condition: async () => false, nextStep: 'other-step' },
            ],
          },
          'current-step': {},
        },
      };

      const formData = { 'step-a': { visited: true } };
      const result = await getPreviousStep(mockReq, 'current-step', testConfig, formData);

      expect(result).toBe('step-a');
    });

    it('should check defaultNext when finding previous step', async () => {
      const testConfig: JourneyFlowConfig = {
        basePath: '/test',
        stepOrder: ['step-a', 'current-step'],
        steps: {
          'step-a': {
            defaultNext: 'current-step',
          },
          'current-step': {},
        },
      };

      const formData = { 'step-a': { visited: true } };
      const result = await getPreviousStep(mockReq, 'current-step', testConfig, formData);

      expect(result).toBe('step-a');
    });
  });

  describe('Steporder fallback', () => {
    it('should use stepOrder array as fallback when no other method works', async () => {
      const testConfig: JourneyFlowConfig = {
        basePath: '/test',
        stepOrder: ['step-a', 'step-b', 'step-c'],
        steps: {
          'step-a': {},
          'step-b': {},
          'step-c': {},
        },
      };

      const result = await getPreviousStep(mockReq, 'step-c', testConfig, {});

      expect(result).toBe('step-b');
    });

    it('should return correct step from stepOrder at any index', async () => {
      const testConfig: JourneyFlowConfig = {
        basePath: '/test',
        stepOrder: ['first', 'second', 'third', 'fourth'],
        steps: {
          first: {},
          second: {},
          third: {},
          fourth: {},
        },
      };

      const resultFromThird = await getPreviousStep(mockReq, 'third', testConfig, {});
      expect(resultFromThird).toBe('second');

      const resultFromFourth = await getPreviousStep(mockReq, 'fourth', testConfig, {});
      expect(resultFromFourth).toBe('third');
    });
  });

  describe('Edge cases', () => {
    it('should return null for first step in stepOrder', async () => {
      const testConfig: JourneyFlowConfig = {
        basePath: '/test',
        stepOrder: ['first-step', 'second-step'],
        steps: {
          'first-step': {},
          'second-step': {},
        },
      };

      const result = await getPreviousStep(mockReq, 'first-step', testConfig, {});

      expect(result).toBeNull();
    });

    it('should return null for step not found in configuration', async () => {
      const testConfig: JourneyFlowConfig = {
        basePath: '/test',
        stepOrder: ['step-a'],
        steps: {
          'step-a': {},
        },
      };

      const result = await getPreviousStep(mockReq, 'non-existent-step', testConfig, {});

      expect(result).toBeNull();
    });

    it('should handle empty formData gracefully', async () => {
      const testConfig: JourneyFlowConfig = {
        basePath: '/test',
        stepOrder: ['step-a', 'step-b'],
        steps: {
          'step-a': {},
          'step-b': {},
        },
      };

      const result = await getPreviousStep(mockReq, 'step-b', testConfig, {});

      expect(result).toBe('step-a');
    });
  });
});
