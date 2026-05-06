import type { Request } from 'express';

import {
  RESPOND_TO_CLAIM_SECTION_IDS,
  respondToClaimSections,
} from '../../../../main/steps/respond-to-claim/sections.config';
import { stepRegistry } from '../../../../main/steps/respond-to-claim/stepRegistry';
import { getSectionCoverage } from '../../../../main/steps/utils/sections';

const findSection = (id: string) => respondToClaimSections.find(section => section.id === id);

describe('respond-to-claim sections config', () => {
  it('maps every sectioned flow step to exactly one section', () => {
    const nonSectionStepSlugs = new Set(['end-now']);
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
    expect(findSection('uploadFiles')?.steps).toEqual(['upload-docs']);
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
});
