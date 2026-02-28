import type { Request } from 'express';

import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createFormStep, getTranslationFunction } from '../../../modules/steps';
import { getClaimantName } from '../../utils';
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
  extendGetContent: (req: Request) => {
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
              enableErrorClearing: true,
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
