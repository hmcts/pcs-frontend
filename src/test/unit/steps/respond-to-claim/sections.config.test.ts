import type { Request } from 'express';

import { flowConfig } from '../../../../main/steps/respond-to-claim/flow.config';
import { respondToClaimSections } from '../../../../main/steps/respond-to-claim/sections.config';
import { getSectionCoverage } from '../../../../main/steps/utils/sections';

describe('respond-to-claim sections config', () => {
  it('maps every configured flow step to exactly one section', () => {
    const flowStepSlugs = Object.keys(flowConfig.steps);
    const coverage = getSectionCoverage(flowStepSlugs, respondToClaimSections);

    expect(coverage.unmappedSteps).toEqual([]);
    expect(coverage.duplicateAssignments).toEqual([]);
  });

  it('keeps placeholder sections available for future steps', () => {
    expect(respondToClaimSections.uploadFiles.steps).toEqual([]);
    expect(respondToClaimSections.checkYourAnswersAndSubmit.steps).toEqual([]);
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
