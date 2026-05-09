import type { Request } from 'express';

import { respondToClaimSections } from '../../../../main/steps/respond-to-claim/sections.config';
import { stepRegistry } from '../../../../main/steps/respond-to-claim/stepRegistry';
import { getSectionCoverage } from '../../../../main/steps/utils/sections';

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

    for (const section of Object.values(respondToClaimSections)) {
      for (const slug of section.steps) {
        if (!flowStepKeys.has(slug)) {
          sectionStepsNotInFlow.push(slug);
        }
      }
    }

    expect(sectionStepsNotInFlow).toEqual([]);
  });

  it('maps upload section steps', () => {
    expect(respondToClaimSections.uploadFiles.steps).toEqual(['upload-document', 'support-needs']);
  });

  it('maps end-of-journey steps into final section', () => {
    expect(respondToClaimSections.checkYourAnswersAndSubmit.steps).toEqual([
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

    await expect(respondToClaimSections.payments.isApplicable?.(req)).resolves.toBe(true);
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

    await expect(respondToClaimSections.payments.isApplicable?.(req)).resolves.toBe(false);
  });
});
