import type { Request } from 'express';

import { buildCcdCaseForPossessionClaimResponse as buildAndSubmitPossessionClaimResponse } from '../../utils/populateResponseToClaimPayloadmap';
import { createRespondToClaimFormStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import type { PossessionClaimResponse, YesNoNotSureValue } from '@services/ccdCase.interface';

const STEP_NAME = 'written-terms';

export const step: StepDefinition = createRespondToClaimFormStep({
  stepName: STEP_NAME,
  stepDir: __dirname,
  customTemplate: `${__dirname}/writtenTerms.njk`,
  translationKeys: {
    caption: 'caption',
    pageTitle: 'pageTitle',
    introText: 'introText',
  },
  fields: [
    {
      name: 'writtenTerms',
      type: 'radio',
      required: true,
      translationKey: {
        label: 'question',
      },
      legendClasses: 'govuk-fieldset__legend--m',
      options: [
        { value: 'YES', translationKey: 'options.yes' },
        { value: 'NO', translationKey: 'options.no' },
        { divider: 'options.or' },
        { value: 'NOT_SURE', translationKey: 'options.imNotSure' },
      ],
    },
  ],
  getInitialFormData: async req => {
    const caseData = req.res?.locals?.validatedCase?.data;
    const writtenTerms = caseData?.possessionClaimResponse?.defendantResponses?.writtenTerms as string | undefined;
    return { writtenTerms };
  },
  beforeRedirect: async (req: Request) => {
    const writtenTerms: YesNoNotSureValue | undefined = req.body?.writtenTerms;

    if (!writtenTerms) {
      return;
    }

    const possessionClaimResponse: PossessionClaimResponse = {
      defendantResponses: {
        writtenTerms,
      },
    };

    await buildAndSubmitPossessionClaimResponse(req, possessionClaimResponse);
  },
});
