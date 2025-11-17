import { GetController } from '../../../../main/app/controller/GetController';
import { StepRegistry } from '../../../../main/app/utils/stepRegistry';
import type { StepDefinition } from '../../../../main/interfaces/stepFormData.interface';

describe('StepRegistry', () => {
  let registry: StepRegistry;

  beforeEach(() => {
    registry = new StepRegistry();
  });

  describe('registerStep', () => {
    it('should register a step', () => {
      const step: StepDefinition = {
        url: '/test-step',
        name: 'test-step',
        view: 'test.njk',
        stepDir: '/test',
        generateContent: () => ({}),
        getController: new GetController('test.njk', () => ({})),
      };

      registry.registerStep(step);
      expect(registry.getStep('test-step')).toBe(step);
    });

    it('should maintain step order by stepNumber', () => {
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

      const step3: StepDefinition = {
        url: '/step3',
        name: 'step3',
        view: 'step3.njk',
        stepDir: '/step3',
        stepNumber: 3,
        generateContent: () => ({}),
        getController: new GetController('test.njk', () => ({})),
      };

      // Register out of order
      registry.registerStep(step3);
      registry.registerStep(step1);
      registry.registerStep(step2);

      const order = registry.getStepOrder();
      expect(order).toEqual(['step1', 'step2', 'step3']);
    });

    it('should maintain insertion order when stepNumber is not provided', () => {
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

      registry.registerStep(step1);
      registry.registerStep(step2);

      const order = registry.getStepOrder();
      expect(order).toEqual(['step1', 'step2']);
    });
  });

  describe('getStep', () => {
    it('should return step by name', () => {
      const step: StepDefinition = {
        url: '/test-step',
        name: 'test-step',
        view: 'test.njk',
        stepDir: '/test',
        generateContent: () => ({}),
        getController: new GetController('test.njk', () => ({})),
      };

      registry.registerStep(step);
      expect(registry.getStep('test-step')).toBe(step);
    });

    it('should return undefined for non-existent step', () => {
      expect(registry.getStep('non-existent')).toBeUndefined();
    });
  });

  describe('getStepByUrl', () => {
    it('should return step by URL', () => {
      const step: StepDefinition = {
        url: '/test-step',
        name: 'test-step',
        view: 'test.njk',
        stepDir: '/test',
        generateContent: () => ({}),
        getController: new GetController('test.njk', () => ({})),
      };

      registry.registerStep(step);
      expect(registry.getStepByUrl('/test-step')).toBe(step);
    });

    it('should return undefined for non-existent URL', () => {
      expect(registry.getStepByUrl('/non-existent')).toBeUndefined();
    });
  });

  describe('getAllSteps', () => {
    it('should return all registered steps', () => {
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

      registry.registerStep(step1);
      registry.registerStep(step2);

      const allSteps = registry.getAllSteps();
      expect(allSteps).toHaveLength(2);
      expect(allSteps).toContain(step1);
      expect(allSteps).toContain(step2);
    });
  });

  describe('getNextStepName', () => {
    it('should return next step name in order', () => {
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

      registry.registerStep(step1);
      registry.registerStep(step2);

      expect(registry.getNextStepName('step1')).toBe('step2');
    });

    it('should return null for last step', () => {
      const step1: StepDefinition = {
        url: '/step1',
        name: 'step1',
        view: 'step1.njk',
        stepDir: '/step1',
        stepNumber: 1,
        generateContent: () => ({}),
        getController: new GetController('test.njk', () => ({})),
      };

      registry.registerStep(step1);

      expect(registry.getNextStepName('step1')).toBeNull();
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

      registry.registerStep(step1);
      registry.registerStep(customStep);

      expect(registry.getNextStepName('step1', {}, {})).toBe('custom-step');
    });

    it('should return null if getNextStep returns null', () => {
      const step1: StepDefinition = {
        url: '/step1',
        name: 'step1',
        view: 'step1.njk',
        stepDir: '/step1',
        stepNumber: 1,
        generateContent: () => ({}),
        getController: new GetController('test.njk', () => ({})),
        getNextStep: () => null,
      };

      registry.registerStep(step1);

      expect(registry.getNextStepName('step1', {}, {})).toBeNull();
    });
  });

  describe('getPreviousStepName', () => {
    it('should return previous step name in order', () => {
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

      registry.registerStep(step1);
      registry.registerStep(step2);

      expect(registry.getPreviousStepName('step2')).toBe('step1');
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

      registry.registerStep(step1);

      expect(registry.getPreviousStepName('step1')).toBeNull();
    });

    it('should use getPreviousStep function if defined', () => {
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
        getPreviousStep: () => 'custom-step',
      };

      const customStep: StepDefinition = {
        url: '/custom-step',
        name: 'custom-step',
        view: 'custom.njk',
        stepDir: '/custom',
        generateContent: () => ({}),
        getController: new GetController('test.njk', () => ({})),
      };

      registry.registerStep(step1);
      registry.registerStep(step2);
      registry.registerStep(customStep);

      expect(registry.getPreviousStepName('step2', {})).toBe('custom-step');
    });
  });

  describe('arePrerequisitesMet', () => {
    it('should return true if step has no prerequisites', () => {
      const step: StepDefinition = {
        url: '/test-step',
        name: 'test-step',
        view: 'test.njk',
        stepDir: '/test',
        generateContent: () => ({}),
        getController: new GetController('test.njk', () => ({})),
      };

      registry.registerStep(step);
      expect(registry.arePrerequisitesMet('test-step', [])).toBe(true);
    });

    it('should return true if all prerequisites are met', () => {
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
        prerequisites: ['step1'],
        generateContent: () => ({}),
        getController: new GetController('test.njk', () => ({})),
      };

      registry.registerStep(step1);
      registry.registerStep(step2);

      expect(registry.arePrerequisitesMet('step2', ['step1'])).toBe(true);
    });

    it('should return false if prerequisites are not met', () => {
      const step2: StepDefinition = {
        url: '/step2',
        name: 'step2',
        view: 'step2.njk',
        stepDir: '/step2',
        prerequisites: ['step1'],
        generateContent: () => ({}),
        getController: new GetController('test.njk', () => ({})),
      };

      registry.registerStep(step2);

      expect(registry.arePrerequisitesMet('step2', [])).toBe(false);
    });

    it('should return false if some prerequisites are missing', () => {
      const step3: StepDefinition = {
        url: '/step3',
        name: 'step3',
        view: 'step3.njk',
        stepDir: '/step3',
        prerequisites: ['step1', 'step2'],
        generateContent: () => ({}),
        getController: new GetController('test.njk', () => ({})),
      };

      registry.registerStep(step3);

      expect(registry.arePrerequisitesMet('step3', ['step1'])).toBe(false);
    });
  });
});
