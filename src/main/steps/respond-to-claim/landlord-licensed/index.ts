import { buildCcdCaseForPossessionClaimResponse } from '../../utils/populateResponseToClaimPayloadmap';
import { flowConfig } from '../flow.config';

import { createFormStep } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import type { PossessionClaimResponse } from '@services/ccdCaseData.model';

export const step: StepDefinition = createFormStep({
  stepName: 'landlord-licensed',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/landlordLicensed.njk`,
  translationKeys: {
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
  getInitialFormData: async req => {
    const landlordLicensed = req.res?.locals?.validatedCase?.defendantResponsesLandlordLicensed as string | undefined;

    const mapping: Record<string, string> = {
      YES: 'yes',
      NO: 'no',
      NOT_SURE: 'imNotSure',
    };

    return {
      confirmLandlordLicensed: landlordLicensed ? mapping[landlordLicensed] : undefined,
    };
  },
});
