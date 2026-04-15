import type { Request } from 'express';

import type { SectionConfig } from '../../../../main/interfaces/stepFlow.interface';
import {
  getFirstStepInSection,
  getSectionCoverage,
  getSectionForStep,
  getStepsInSection,
  isLastStepInSection,
  isSectionApplicable,
} from '../../../../main/steps/utils/sections';

const testSections: Record<string, SectionConfig> = {
  sectionA: {
    titleKey: 'sectionA',
    order: 1,
    steps: ['step-a1', 'step-a2'],
  },
  sectionB: {
    titleKey: 'sectionB',
    order: 2,
    steps: ['step-b1'],
    isApplicable: async req => Boolean(req.res?.locals?.validatedCase),
  },
};

describe('sections utils', () => {
  describe('getSectionForStep', () => {
    it('returns matching section id for a known step', () => {
      expect(getSectionForStep('step-a1', testSections)).toBe('sectionA');
      expect(getSectionForStep('step-b1', testSections)).toBe('sectionB');
    });

    it('returns null when step is unknown', () => {
      expect(getSectionForStep('unknown-step', testSections)).toBeNull();
    });
  });

  describe('getStepsInSection', () => {
    it('returns ordered step list for known section', () => {
      expect(getStepsInSection('sectionA', testSections)).toEqual(['step-a1', 'step-a2']);
    });

    it('returns empty array for unknown section', () => {
      expect(getStepsInSection('missing-section', testSections)).toEqual([]);
    });
  });

  describe('getFirstStepInSection', () => {
    it('returns first step for a known section', () => {
      expect(getFirstStepInSection('sectionA', testSections)).toBe('step-a1');
    });

    it('returns null for unknown section', () => {
      expect(getFirstStepInSection('missing-section', testSections)).toBeNull();
    });
  });

  describe('isSectionApplicable', () => {
    it('returns true for sections without applicability condition', async () => {
      const req = {} as Request;
      await expect(isSectionApplicable('sectionA', testSections, req)).resolves.toBe(true);
    });

    it('evaluates applicability condition for conditional section', async () => {
      const applicableReq = {
        res: { locals: { validatedCase: { data: {} } } },
      } as unknown as Request;
      const nonApplicableReq = {
        res: { locals: {} },
      } as unknown as Request;

      await expect(isSectionApplicable('sectionB', testSections, applicableReq)).resolves.toBe(true);
      await expect(isSectionApplicable('sectionB', testSections, nonApplicableReq)).resolves.toBe(false);
    });

    it('returns false for unknown section', async () => {
      const req = {} as Request;
      await expect(isSectionApplicable('missing-section', testSections, req)).resolves.toBe(false);
    });
  });

  describe('isLastStepInSection', () => {
    it('returns false when transition stays in same section', () => {
      expect(isLastStepInSection('step-a1', 'step-a2', testSections)).toBe(false);
    });

    it('returns true when transition crosses section boundary', () => {
      expect(isLastStepInSection('step-a2', 'step-b1', testSections)).toBe(true);
    });

    it('returns true when next step is null', () => {
      expect(isLastStepInSection('step-b1', null, testSections)).toBe(true);
    });

    it('returns true when next step is not in any section but current step is', () => {
      expect(isLastStepInSection('step-a2', 'end-now', testSections)).toBe(true);
    });

    it('returns false when current step is not in any section', () => {
      expect(isLastStepInSection('orphan-step', 'step-a1', testSections)).toBe(false);
    });
  });

  describe('getSectionCoverage', () => {
    it('returns no issues when each step is mapped exactly once', () => {
      expect(getSectionCoverage(['step-a1', 'step-a2', 'step-b1'], testSections)).toEqual({
        unmappedSteps: [],
        duplicateAssignments: [],
      });
    });

    it('detects unmapped and duplicate mappings', () => {
      const overlappingSections: Record<string, SectionConfig> = {
        ...testSections,
        sectionC: {
          titleKey: 'sectionC',
          order: 3,
          steps: ['step-a2'],
        },
      };

      expect(getSectionCoverage(['step-a1', 'step-a2', 'step-b1', 'step-z1'], overlappingSections)).toEqual({
        unmappedSteps: ['step-z1'],
        duplicateAssignments: ['step-a2'],
      });
    });
  });
});
