import type { Request } from 'express';

import type { PossessionClaimResponse } from '../../../interfaces/ccdCase.interface';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createFormStep, getTranslationFunction } from '../../../modules/steps';
import { getClaimantName } from '../../utils';
import { buildCcdCaseForPossessionClaimResponse as buildAndSubmitPossessionClaimResponse } from '../../utils/populateResponseToClaimPayloadmap';
import { flowConfig } from '../flow.config';

export const step: StepDefinition = createFormStep({
  stepName: 'non-rent-arrears-dispute',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/nonRentArrearsDispute.njk`,
  translationKeys: {
    title: 'title',
    introParagraph: 'introParagraph',
    introLinkHref: 'introLinkHref',
    includesHeading: 'includesHeading',
    caption: 'captionHeading',
  },
  beforeRedirect: async (req: Request) => {
    const disputeClaimRaw = req.body?.disputeClaim as 'yes' | 'no' | undefined;
    // Sub-field is submitted with dotted name: parentField.subField
    const disputeDetailsRaw = req.body?.['disputeClaim.disputeDetails'] as string | undefined;

    const disputeClaim = disputeClaimRaw === 'yes' ? 'YES' : disputeClaimRaw === 'no' ? 'NO' : undefined;

    const possessionClaimResponse: PossessionClaimResponse = {
      defendantResponses: {
        disputeClaim,
        ...(disputeClaimRaw === 'yes' && disputeDetailsRaw ? { disputeDetails: disputeDetailsRaw } : {}),
      },
    };

    await buildAndSubmitPossessionClaimResponse(req, possessionClaimResponse);
  },
  extendGetContent: (req: Request) => {
    console.log('non-rent-arrears-dispute CCD case data:', JSON.stringify(req.res?.locals.validatedCase?.data, null, 2));

    const claimantName = getClaimantName(req);

    const t = getTranslationFunction(req, 'non-rent-arrears-dispute', ['common']);

    // i18next automatically interpolates variables and applies formatters in translation strings
    const includesList = t('includesList', { returnObjects: true, claimantName });

    return {
      includesList,
    };
  },
  fields: [
    {
      name: 'disputeClaim',
      type: 'radio',
      required: true,
      translationKey: {
        label: 'disputeQuestion',
      },
      legendClasses: 'govuk-fieldset__legend--m',
      options: [
        {
          value: 'yes',
          translationKey: 'disputeOptions.yes',
          subFields: {
            disputeDetails: {
              name: 'disputeDetails',
              type: 'character-count',
              required: true,
              errorMessage: 'errors.disputeDetails',
              maxLength: 6500,
              translationKey: {
                label: 'disputeDetails.label',
              },
              attributes: {
                rows: 5,
              },
            },
          },
        },
        {
          value: 'no',
          translationKey: 'disputeOptions.no',
        },
      ],
    },
  ],
});
