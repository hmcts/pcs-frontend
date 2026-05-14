import type { Request } from 'express';

import { flowConfig } from '../../../../main/steps/respond-to-claim/flow.config';
import {
  RESPOND_TO_CLAIM_SECTION_IDS,
  respondToClaimSections,
} from '../../../../main/steps/respond-to-claim/sections.config';
import { stepRegistry } from '../../../../main/steps/respond-to-claim/stepRegistry';
import { getSectionCoverage, getSectionForStep } from '../../../../main/steps/utils/sections';

const findSection = (id: string) => respondToClaimSections.find(section => section.id === id);

describe('respond-to-claim sections config', () => {
  it('maps every sectioned flow step to exactly one section', () => {
    const nonSectionStepSlugs = new Set(flowConfig.nonSectionStepOrder ?? []);
    const flowStepSlugs = Object.keys(stepRegistry).filter(stepSlug => !nonSectionStepSlugs.has(stepSlug));
    const coverage = getSectionCoverage(flowStepSlugs, respondToClaimSections);

    expect(coverage.unmappedSteps).toEqual([]);
    expect(coverage.duplicateAssignments).toEqual([]);
  });

  it('lists only steps that exist in the configured journey order', () => {
    const flowStepKeys = new Set(Object.keys(stepRegistry));
    const sectionStepsNotInFlow: string[] = [];

    for (const section of respondToClaimSections) {
      for (const slug of section.steps) {
        if (!flowStepKeys.has(slug)) {
          sectionStepsNotInFlow.push(slug);
        }
      }
    }

    expect(sectionStepsNotInFlow).toEqual([]);
  });

  it('section ids match the canonical id list (no missing or extra sections)', () => {
    expect(respondToClaimSections.map(section => section.id)).toEqual([...RESPOND_TO_CLAIM_SECTION_IDS]);
  });

  it('has no duplicate section ids', () => {
    const ids = respondToClaimSections.map(section => section.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('maps upload section steps', () => {
    expect(findSection('uploadFiles')?.steps).toEqual(['upload-document', 'support-needs', 'section-cya-upload-files']);
  });

  it('maps end-of-journey steps into final section', () => {
    expect(findSection('checkYourAnswersAndSubmit')?.steps).toEqual([
      'equality-and-diversity-start',
      'equality-and-diversity-end',
      'language-used',
      'check-your-answers',
    ]);
  });

  it('treats payments section as applicable for rent arrears claims', async () => {
    const req = {
      res: {
        locals: {
          validatedCase: {
            data: {
              claimGroundSummaries: [{ value: { isRentArrears: 'Yes' }, id: 'ground-1' }],
            },
          },
        },
      },
    } as unknown as Request;

    await expect(findSection('payments')?.isApplicable?.(req)).resolves.toBe(true);
  });

  it('treats payments section as not applicable for non-rent arrears claims', async () => {
    const req = {
      res: {
        locals: {
          validatedCase: {
            data: {
              claimGroundSummaries: [{ value: { isRentArrears: 'No' }, id: 'ground-1' }],
            },
          },
        },
      },
    } as unknown as Request;

    await expect(findSection('payments')?.isApplicable?.(req)).resolves.toBe(false);
  });

  describe('section coherence — no cross-section navigation references', () => {
    const sectionFor = (slug: string) => getSectionForStep(slug, respondToClaimSections);

    it('every routes[].nextStep stays within the same section (or targets a non-section step)', () => {
      const violations: string[] = [];

      for (const [fromSlug, step] of Object.entries(flowConfig.steps)) {
        const fromSection = sectionFor(fromSlug);
        for (const route of step.routes ?? []) {
          const toSection = sectionFor(route.nextStep);
          if (toSection !== null && fromSection !== null && fromSection !== toSection) {
            violations.push(`${fromSlug} (${fromSection}) -> ${route.nextStep} (${toSection})`);
          }
        }
      }

      expect(violations).toEqual([]);
    });

    it('every string previousStep stays within the same section (or targets a non-section step)', () => {
      const violations: string[] = [];

      for (const [slug, step] of Object.entries(flowConfig.steps)) {
        if (typeof step.previousStep !== 'string') {
          continue;
        }
        const fromSection = sectionFor(slug);
        const toSection = sectionFor(step.previousStep);
        if (toSection !== null && fromSection !== null && fromSection !== toSection) {
          violations.push(`${slug} (${fromSection}) -> previousStep ${step.previousStep} (${toSection})`);
        }
      }

      expect(violations).toEqual([]);
    });
  });
});
