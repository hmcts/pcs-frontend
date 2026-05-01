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
      name: 'aboutCounterclaimFor',
      type: 'character-count',
      required: true,
      maxLength: 6800,
      errorMessage: 'errors.aboutCounterclaimForRequired',
      labelClasses: 'govuk-label--s',
      translationKey: {
        label: 'aboutCounterclaimForLabel',
      },
    },
    {
      name: 'aboutCounterclaimReasons',
      type: 'character-count',
      required: true,
      maxLength: 6800,
      errorMessage: 'errors.aboutCounterclaimReasonsRequired',
      labelClasses: 'govuk-label--s',
      translationKey: {
        label: 'aboutCounterclaimReasonsLabel',
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
      ...(counterClaim.aboutCounterclaimFor ? { aboutCounterclaimFor: counterClaim.aboutCounterclaimFor } : {}),
      ...(counterClaim.aboutCounterclaimReasons
        ? { aboutCounterclaimReasons: counterClaim.aboutCounterclaimReasons }
        : {}),
    };
  },
  beforeRedirect: async (req: Request) => {
    const aboutCounterclaimFor = (req.body?.aboutCounterclaimFor as string | undefined)?.trim();
    const aboutCounterclaimReasons = (req.body?.aboutCounterclaimReasons as string | undefined)?.trim();

    const counterClaim: CcdCounterClaim = {
      ...(aboutCounterclaimFor ? { aboutCounterclaimFor } : {}),
      ...(aboutCounterclaimReasons ? { aboutCounterclaimReasons } : {}),
    };
    const possessionClaimResponse: PossessionClaimResponse = {
      defendantResponses: { counterClaim: { ...counterClaim } },
    };
    await buildCcdCaseForPossessionClaimResponse(req, possessionClaimResponse);
  },
});
