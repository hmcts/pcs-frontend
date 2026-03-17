import type { PossessionClaimResponse } from '../../../interfaces/ccdCase.interface';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { flowConfig } from '../flow.config';

import { createFormStep } from '@modules/steps';
import { buildCcdCaseForPossessionClaimResponse } from 'steps/utils/populateResponseToClaimPayloadmap';

export const step: StepDefinition = createFormStep({
  stepName: 'landlord-licensed',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/landlordLicensed.njk`,
  translationKeys: {
    caption: 'caption',
    pageTitle: 'pageTitle',
    question: 'question',
    paragraph: 'paragraph',
  },
  fields: [
    {
      name: 'confirmLandlordLicensed',
      type: 'radio',
      required: true,
      translationKey: { label: 'question' },
      legendClasses: 'govuk-fieldset__legend--m',
      options: [
        { value: 'yes', translationKey: 'options.yes' },
        { value: 'no', translationKey: 'options.no' },
        { divider: 'options.or' },
        { value: 'imNotSure', translationKey: 'options.imNotSure' },
      ],
    },
  ],
  beforeRedirect: async req => {
    const confirmValue = req.body?.confirmLandlordLicensed as string | undefined;

    const defendantResponses: Record<string, unknown> = {};

    if (confirmValue === 'yes') {
      defendantResponses.landlordLicensed = 'YES';
    } else if (confirmValue === 'no') {
      defendantResponses.landlordLicensed = 'NO';
    } else if (confirmValue === 'imNotSure') {
      defendantResponses.landlordLicensed = 'NOT_SURE';
    }

    const possessionClaimResponse: PossessionClaimResponse = {
      defendantResponses: {
        ...defendantResponses,
      },
    };

    await buildCcdCaseForPossessionClaimResponse(req, possessionClaimResponse);
  },
});
