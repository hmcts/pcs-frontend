import type { Request } from 'express';

import type { JourneyFlowConfig } from '../../../../main/interfaces/stepFlow.interface';
import { getNextStep } from '../../../../main/modules/steps/flow';

describe('getNextStep Algorithm', () => {
  const mockReq = {
    res: {
      locals: {
        validatedCase: {
          data: {},
        },
      },
    },
  } as unknown as Request;

  describe('Routes with conditions', () => {
    it('should evaluate condition function and return matching nextStep', async () => {
      const testConfig: JourneyFlowConfig = {
        basePath: '/test',
        stepOrder: ['step-a', 'step-b', 'step-c'],
        steps: {
          'step-a': {
            routes: [
              { condition: async () => true, nextStep: 'step-b' },
              { condition: async () => false, nextStep: 'step-c' },
            ],
          },
        },
      };

      const result = await getNextStep(mockReq, 'step-a', testConfig, {});

      expect(result).toBe('step-b');
    });

    it('should try multiple conditions until one matches', async () => {
      const testConfig: JourneyFlowConfig = {
        basePath: '/test',
        stepOrder: ['step-a', 'step-b', 'step-c', 'step-d'],
        steps: {
          'step-a': {
            routes: [
              { condition: async () => false, nextStep: 'step-b' },
              { condition: async () => false, nextStep: 'step-c' },
              { condition: async () => true, nextStep: 'step-d' },
            ],
          },
        },
      };

      const result = await getNextStep(mockReq, 'step-a', testConfig, {});

      expect(result).toBe('step-d');
    });

    it('should pass req and formData to condition function', async () => {
      const mockCondition = jest.fn().mockResolvedValue(true);

      const testConfig: JourneyFlowConfig = {
        basePath: '/test',
        stepOrder: ['step-a', 'step-b'],
        steps: {
          'step-a': {
            routes: [{ condition: mockCondition, nextStep: 'step-b' }],
          },
        },
      };

      const formData = { testData: 'value' };
      await getNextStep(mockReq, 'step-a', testConfig, formData);

      expect(mockCondition).toHaveBeenCalledWith(mockReq, formData, {});
    });
  });

  describe('DefaultNext fallback', () => {
    it('should use defaultNext when no routes defined', async () => {
      const testConfig: JourneyFlowConfig = {
        basePath: '/test',
        stepOrder: ['step-a', 'step-b'],
        steps: {
          'step-a': {
            defaultNext: 'step-b',
          },
        },
      };

      const result = await getNextStep(mockReq, 'step-a', testConfig, {});

      expect(result).toBe('step-b');
    });

    it('should use defaultNext when all route conditions fail', async () => {
      const testConfig: JourneyFlowConfig = {
        basePath: '/test',
        stepOrder: ['step-a', 'step-b', 'step-c'],
        steps: {
          'step-a': {
            routes: [
              { condition: async () => false, nextStep: 'step-b' },
              { condition: async () => false, nextStep: 'step-b' },
            ],
            defaultNext: 'step-c',
          },
        },
      };

      const result = await getNextStep(mockReq, 'step-a', testConfig, {});

      expect(result).toBe('step-c');
    });
  });

  describe('Steporder fallback', () => {
    it('should use stepOrder when no routes or defaultNext defined', async () => {
      const testConfig: JourneyFlowConfig = {
        basePath: '/test',
        stepOrder: ['step-a', 'step-b', 'step-c'],
        steps: {
          'step-a': {},
          'step-b': {},
          'step-c': {},
        },
      };

      const result = await getNextStep(mockReq, 'step-a', testConfig, {});

      expect(result).toBe('step-b');
    });

    it('should return correct next step from stepOrder at any index', async () => {
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

      const resultFromFirst = await getNextStep(mockReq, 'first', testConfig, {});
      expect(resultFromFirst).toBe('second');

      const resultFromSecond = await getNextStep(mockReq, 'second', testConfig, {});
      expect(resultFromSecond).toBe('third');
    });
  });

  describe('Edge cases', () => {
    it('should return null for last step in stepOrder', async () => {
      const testConfig: JourneyFlowConfig = {
        basePath: '/test',
        stepOrder: ['step-a', 'last-step'],
        steps: {
          'step-a': {},
          'last-step': {},
        },
      };

      const result = await getNextStep(mockReq, 'last-step', testConfig, {});

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

      const result = await getNextStep(mockReq, 'non-existent-step', testConfig, {});

      expect(result).toBeNull();
    });

    it('should handle empty formData gracefully', async () => {
      const testConfig: JourneyFlowConfig = {
        basePath: '/test',
        stepOrder: ['step-a', 'step-b'],
        steps: {
          'step-a': {
            defaultNext: 'step-b',
          },
        },
      };

      const result = await getNextStep(mockReq, 'step-a', testConfig, {});

      expect(result).toBe('step-b');
    });
  });
});
