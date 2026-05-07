import type { Request } from 'express';

import { buildCcdCaseForPossessionClaimResponse } from '../../utils/populateResponseToClaimPayloadmap';
import { flowConfig } from '../flow.config';

import { createFormStep } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import type { CcdCounterClaim, PossessionClaimResponse } from '@services/ccdCase.interface';

export const step: StepDefinition = createFormStep({
  stepName: 'counter-claim-about',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/counterClaimAbout.njk`,
  translationKeys: {
    pageTitle: 'pageTitle',
    heading: 'heading',
    infoParagraph1: 'infoParagraph1',
    infoParagraph2: 'infoParagraph2',
  },
  fields: [
    {
      name: 'counterClaimFor',
      type: 'character-count',
      required: true,
      maxLength: 6800,
      errorMessage: 'errors.counterClaimForRequired',
      labelClasses: 'govuk-label--s',
      translationKey: {
        label: 'counterClaimForLabel',
      },
    },
    {
      name: 'counterClaimReasons',
      type: 'character-count',
      required: true,
      maxLength: 6800,
      errorMessage: 'errors.counterClaimReasonsRequired',
      labelClasses: 'govuk-label--s',
      translationKey: {
        label: 'counterClaimReasonsLabel',
      },
    },
  ],
  getInitialFormData: (req: Request) => {
    const counterClaim =
      req.res?.locals?.validatedCase?.data?.possessionClaimResponse?.defendantResponses?.counterClaim;
    if (!counterClaim) {
      return {};
    }
    return {
      ...(counterClaim.counterClaimFor ? { counterClaimFor: counterClaim.counterClaimFor } : {}),
      ...(counterClaim.counterClaimReasons
        ? { counterClaimReasons: counterClaim.counterClaimReasons }
        : {}),
    };
  },
  beforeRedirect: async (req: Request) => {
    const counterClaimFor = (req.body?.counterClaimFor as string | undefined)?.trim();
    const counterClaimReasons = (req.body?.counterClaimReasons as string | undefined)?.trim();

    const counterClaim: CcdCounterClaim = {
      ...(counterClaimFor ? { counterClaimFor } : {}),
      ...(counterClaimReasons ? { counterClaimReasons } : {}),
    };
    const possessionClaimResponse: PossessionClaimResponse = {
      defendantResponses: { counterClaim: { ...counterClaim } },
    };
    await buildCcdCaseForPossessionClaimResponse(req, possessionClaimResponse);
  },
});
