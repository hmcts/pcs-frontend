import 'reflect-metadata';

import { Test, TestingModule } from '@nestjs/testing';

import {
  type JourneyData,
  NestJourneyService,
} from '../../../../main/nest/journey/nest-journey.service';

describe('NestJourneyService', () => {
  let service: NestJourneyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NestJourneyService],
    }).compile();

    service = module.get<NestJourneyService>(NestJourneyService);
  });

  describe('getStepUrl', () => {
    it('should return correct URL for step1', () => {
      expect(service.getStepUrl('step1')).toBe('/nest-journey/step1');
    });

    it('should return correct URL for confirmation', () => {
      expect(service.getStepUrl('confirmation')).toBe('/nest-journey/confirmation');
    });
  });

  describe('getNextStep', () => {
    it('should return step2 after step1', () => {
      expect(service.getNextStep('step1')).toBe('step2');
    });

    it('should return step3 after step2', () => {
      expect(service.getNextStep('step2')).toBe('step3');
    });

    it('should return confirmation after step3', () => {
      expect(service.getNextStep('step3')).toBe('confirmation');
    });

    it('should return null after confirmation', () => {
      expect(service.getNextStep('confirmation')).toBeNull();
    });
  });

  describe('getPreviousStep', () => {
    it('should return null for step1', () => {
      expect(service.getPreviousStep('step1')).toBeNull();
    });

    it('should return step1 for step2', () => {
      expect(service.getPreviousStep('step2')).toBe('step1');
    });

    it('should return step2 for step3', () => {
      expect(service.getPreviousStep('step3')).toBe('step2');
    });

    it('should return step3 for confirmation', () => {
      expect(service.getPreviousStep('confirmation')).toBe('step3');
    });
  });

  describe('canAccessStep', () => {
    it('should always allow access to step1', () => {
      const journeyData: JourneyData = { completedSteps: [] };
      expect(service.canAccessStep('step1', journeyData)).toBe(true);
    });

    it('should not allow access to step2 without completing step1', () => {
      const journeyData: JourneyData = { completedSteps: [] };
      expect(service.canAccessStep('step2', journeyData)).toBe(false);
    });

    it('should allow access to step2 after completing step1', () => {
      const journeyData: JourneyData = { completedSteps: ['step1'] };
      expect(service.canAccessStep('step2', journeyData)).toBe(true);
    });

    it('should not allow access to step3 without completing step2', () => {
      const journeyData: JourneyData = { completedSteps: ['step1'] };
      expect(service.canAccessStep('step3', journeyData)).toBe(false);
    });

    it('should allow access to step3 after completing step1 and step2', () => {
      const journeyData: JourneyData = { completedSteps: ['step1', 'step2'] };
      expect(service.canAccessStep('step3', journeyData)).toBe(true);
    });

    it('should not allow access to confirmation without completing step3', () => {
      const journeyData: JourneyData = { completedSteps: ['step1', 'step2'] };
      expect(service.canAccessStep('confirmation', journeyData)).toBe(false);
    });

    it('should allow access to confirmation after completing all steps', () => {
      const journeyData: JourneyData = { completedSteps: ['step1', 'step2', 'step3'] };
      expect(service.canAccessStep('confirmation', journeyData)).toBe(true);
    });
  });

  describe('getFirstIncompleteStep', () => {
    it('should return step1 when no steps completed', () => {
      const journeyData: JourneyData = { completedSteps: [] };
      expect(service.getFirstIncompleteStep(journeyData)).toBe('step1');
    });

    it('should return step2 when step1 completed', () => {
      const journeyData: JourneyData = { completedSteps: ['step1'] };
      expect(service.getFirstIncompleteStep(journeyData)).toBe('step2');
    });

    it('should return step3 when step1 and step2 completed', () => {
      const journeyData: JourneyData = { completedSteps: ['step1', 'step2'] };
      expect(service.getFirstIncompleteStep(journeyData)).toBe('step3');
    });

    it('should return confirmation when all steps completed', () => {
      const journeyData: JourneyData = { completedSteps: ['step1', 'step2', 'step3'] };
      expect(service.getFirstIncompleteStep(journeyData)).toBe('confirmation');
    });
  });

  describe('markStepComplete', () => {
    it('should add step to completedSteps', () => {
      const journeyData: JourneyData = { completedSteps: [] };
      service.markStepComplete(journeyData, 'step1');
      expect(journeyData.completedSteps).toContain('step1');
    });

    it('should not duplicate step in completedSteps', () => {
      const journeyData: JourneyData = { completedSteps: ['step1'] };
      service.markStepComplete(journeyData, 'step1');
      expect(journeyData.completedSteps.filter(s => s === 'step1')).toHaveLength(1);
    });
  });

  describe('getBackUrl', () => {
    it('should return dashboard for step1', () => {
      expect(service.getBackUrl('step1')).toBe('/dashboard');
    });

    it('should return step1 URL for step2', () => {
      expect(service.getBackUrl('step2')).toBe('/nest-journey/step1');
    });

    it('should return step2 URL for step3', () => {
      expect(service.getBackUrl('step3')).toBe('/nest-journey/step2');
    });
  });
});
