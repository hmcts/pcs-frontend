import type { NextFunction, Request, Response } from 'express';

import { radioQuestion } from '../../fieldBuilders';
import { createClaimFromStartAnswers } from '../createClaim';
import { MAKE_A_CLAIM_START_ROUTE } from '../flow.config';
import { isWelshProperty } from '../propertyCountry';
import { createStartStep } from '../startStep';

import { getFormData } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';

const WALES_CLAIMANT_TYPES = ['PRIVATE_LANDLORD', 'COMMUNITY_LANDLORD', 'MORTGAGE_LENDER'] as const;

/** The Wales claimant types are only asked about a property in Wales. */
function walesPropertyOnly(req: Request, res: Response, next: NextFunction): void {
  if (!isWelshProperty(req)) {
    return res.redirect(303, `${MAKE_A_CLAIM_START_ROUTE}/property-address`);
  }
  next();
}

const startStep = createStartStep({
  stepName: 'wales-claimant-type',
  stepDir: __dirname,
  fields: [radioQuestion('walesClaimantType', WALES_CLAIMANT_TYPES)],
  beforeRedirect: async req => {
    if (req.body?.walesClaimantType !== 'PRIVATE_LANDLORD') {
      return;
    }
    if (getFormData(req, 'who-is-claiming').whoIsClaiming === 'MYSELF') {
      req.res?.redirect(303, await createClaimFromStartAnswers(req));
    }
  },
});

export const step: StepDefinition = {
  ...startStep,
  middleware: [...(startStep.middleware ?? []), walesPropertyOnly],
};
