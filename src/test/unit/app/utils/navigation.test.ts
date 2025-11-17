import type { Request } from 'express';

import { GetController } from '../../../../main/app/controller/GetController';
import { getFormData } from '../../../../main/app/controller/sessionHelper';
import {
  getAllFormData,
  getBackUrl,
  getCompletedSteps,
  getNextStepUrl,
  getPreviousStepUrl,
} from '../../../../main/app/utils/navigation';
import { stepRegistry } from '../../../../main/app/utils/stepRegistry';
import type { StepDefinition } from '../../../../main/interfaces/stepFormData.interface';

// Mock sessionHelper
jest.mock('../../../../main/app/controller/sessionHelper', () => ({
  getFormData: jest.fn(),
  setFormData: jest.fn(),
}));

describe('Navigation Helpers', () => {
  let mockReq: Partial<Request>;

  beforeEach(() => {
    jest.clearAllMocks();
    stepRegistry.clear();

    mockReq = {
      session: {
        formData: {},
      },
    } as Partial<Request>;
  });

  describe('getAllFormData', () => {
    it('should collect form data from all steps', () => {
      const step1: StepDefinition = {
        url: '/step1',
        name: 'step1',
        view: 'step1.njk',
        stepDir: '/step1',
        generateContent: () => ({}),
        getController: new GetController('test.njk', () => ({})),
      };

      const step2: StepDefinition = {
        url: '/step2',
        name: 'step2',
        view: 'step2.njk',
        stepDir: '/step2',
        generateContent: () => ({}),
        getController: new GetController('test.njk', () => ({})),
      };

      stepRegistry.registerStep(step1);
      stepRegistry.registerStep(step2);

      (getFormData as jest.Mock).mockReturnValueOnce({ field1: 'value1' }).mockReturnValueOnce({ field2: 'value2' });

      const allData = getAllFormData(mockReq as Request);

      expect(allData).toEqual({
        field1: 'value1',
        field2: 'value2',
      });
    });

    it('should return empty object if no form data', () => {
      const step1: StepDefinition = {
        url: '/step1',
        name: 'step1',
        view: 'step1.njk',
        stepDir: '/step1',
        generateContent: () => ({}),
        getController: new GetController('test.njk', () => ({})),
      };

      stepRegistry.registerStep(step1);

      (getFormData as jest.Mock).mockReturnValue({});

      const allData = getAllFormData(mockReq as Request);

      expect(allData).toEqual({});
    });
  });

  describe('getNextStepUrl', () => {
    it('should return next step URL', () => {
      const step1: StepDefinition = {
        url: '/step1',
        name: 'step1',
        view: 'step1.njk',
        stepDir: '/step1',
        stepNumber: 1,
        generateContent: () => ({}),
        getController: new GetController('test.njk', () => ({})),
      };

      const step2: StepDefinition = {
        url: '/step2',
        name: 'step2',
        view: 'step2.njk',
        stepDir: '/step2',
        stepNumber: 2,
        generateContent: () => ({}),
        getController: new GetController('test.njk', () => ({})),
      };

      stepRegistry.registerStep(step1);
      stepRegistry.registerStep(step2);

      const nextUrl = getNextStepUrl('step1', {}, {});

      expect(nextUrl).toBe('/step2');
    });

    it('should throw error if no next step found', () => {
      const step1: StepDefinition = {
        url: '/step1',
        name: 'step1',
        view: 'step1.njk',
        stepDir: '/step1',
        stepNumber: 1,
        generateContent: () => ({}),
        getController: new GetController('test.njk', () => ({})),
      };

      stepRegistry.registerStep(step1);

      expect(() => getNextStepUrl('step1', {}, {})).toThrow('No next step found for: step1');
    });

    it('should use getNextStep function if defined', () => {
      const step1: StepDefinition = {
        url: '/step1',
        name: 'step1',
        view: 'step1.njk',
        stepDir: '/step1',
        stepNumber: 1,
        generateContent: () => ({}),
        getController: new GetController('test.njk', () => ({})),
        getNextStep: () => 'custom-step',
      };

      const customStep: StepDefinition = {
        url: '/custom-step',
        name: 'custom-step',
        view: 'custom.njk',
        stepDir: '/custom',
        generateContent: () => ({}),
        getController: new GetController('test.njk', () => ({})),
      };

      stepRegistry.registerStep(step1);
      stepRegistry.registerStep(customStep);

      const nextUrl = getNextStepUrl('step1', {}, {});

      expect(nextUrl).toBe('/custom-step');
    });
  });

  describe('getPreviousStepUrl', () => {
    it('should return previous step URL', () => {
      const step1: StepDefinition = {
        url: '/step1',
        name: 'step1',
        view: 'step1.njk',
        stepDir: '/step1',
        stepNumber: 1,
        generateContent: () => ({}),
        getController: new GetController('test.njk', () => ({})),
      };

      const step2: StepDefinition = {
        url: '/step2',
        name: 'step2',
        view: 'step2.njk',
        stepDir: '/step2',
        stepNumber: 2,
        generateContent: () => ({}),
        getController: new GetController('test.njk', () => ({})),
      };

      stepRegistry.registerStep(step1);
      stepRegistry.registerStep(step2);

      const prevUrl = getPreviousStepUrl('step2', {});

      expect(prevUrl).toBe('/step1');
    });

    it('should return null for first step', () => {
      const step1: StepDefinition = {
        url: '/step1',
        name: 'step1',
        view: 'step1.njk',
        stepDir: '/step1',
        stepNumber: 1,
        generateContent: () => ({}),
        getController: new GetController('test.njk', () => ({})),
      };

      stepRegistry.registerStep(step1);

      const prevUrl = getPreviousStepUrl('step1', {});

      expect(prevUrl).toBeNull();
    });

    it('should return null if previous step not found', () => {
      const step1: StepDefinition = {
        url: '/step1',
        name: 'step1',
        view: 'step1.njk',
        stepDir: '/step1',
        stepNumber: 1,
        generateContent: () => ({}),
        getController: new GetController('test.njk', () => ({})),
        getPreviousStep: () => 'non-existent',
      };

      stepRegistry.registerStep(step1);

      const prevUrl = getPreviousStepUrl('step1', {});

      expect(prevUrl).toBeNull();
    });
  });

  describe('getBackUrl', () => {
    it('should return previous step URL', () => {
      const step1: StepDefinition = {
        url: '/step1',
        name: 'step1',
        view: 'step1.njk',
        stepDir: '/step1',
        stepNumber: 1,
        generateContent: () => ({}),
        getController: new GetController('test.njk', () => ({})),
      };

      const step2: StepDefinition = {
        url: '/step2',
        name: 'step2',
        view: 'step2.njk',
        stepDir: '/step2',
        stepNumber: 2,
        generateContent: () => ({}),
        getController: new GetController('test.njk', () => ({})),
      };

      stepRegistry.registerStep(step1);
      stepRegistry.registerStep(step2);

      (getFormData as jest.Mock).mockReturnValue({});

      const backUrl = getBackUrl(mockReq as Request, 'step2');

      expect(backUrl).toBe('/step1');
    });

    it('should return null for first step', () => {
      const step1: StepDefinition = {
        url: '/step1',
        name: 'step1',
        view: 'step1.njk',
        stepDir: '/step1',
        stepNumber: 1,
        generateContent: () => ({}),
        getController: new GetController('test.njk', () => ({})),
      };

      stepRegistry.registerStep(step1);

      (getFormData as jest.Mock).mockReturnValue({});

      const backUrl = getBackUrl(mockReq as Request, 'step1');

      expect(backUrl).toBeNull();
    });
  });

  describe('getCompletedSteps', () => {
    it('should return list of completed steps', () => {
      const step1: StepDefinition = {
        url: '/step1',
        name: 'step1',
        view: 'step1.njk',
        stepDir: '/step1',
        generateContent: () => ({}),
        getController: new GetController('test.njk', () => ({})),
      };

      const step2: StepDefinition = {
        url: '/step2',
        name: 'step2',
        view: 'step2.njk',
        stepDir: '/step2',
        generateContent: () => ({}),
        getController: new GetController('test.njk', () => ({})),
      };

      stepRegistry.registerStep(step1);
      stepRegistry.registerStep(step2);

      (getFormData as jest.Mock)
        .mockReturnValueOnce({ field1: 'value1' }) // step1 has data
        .mockReturnValueOnce({}); // step2 has no data

      const completedSteps = getCompletedSteps(mockReq as Request);

      expect(completedSteps).toEqual(['step1']);
    });

    it('should return empty array if no steps completed', () => {
      const step1: StepDefinition = {
        url: '/step1',
        name: 'step1',
        view: 'step1.njk',
        stepDir: '/step1',
        generateContent: () => ({}),
        getController: new GetController('test.njk', () => ({})),
      };

      stepRegistry.registerStep(step1);

      (getFormData as jest.Mock).mockReturnValue({});

      const completedSteps = getCompletedSteps(mockReq as Request);

      expect(completedSteps).toEqual([]);
    });
  });
});
