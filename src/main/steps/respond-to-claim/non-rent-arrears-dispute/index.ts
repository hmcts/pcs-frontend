import type { Request } from 'express';

import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createFormStep, getTranslationFunction } from '../../../modules/steps';
import { flowConfig } from '../flow.config';

export const step: StepDefinition = createFormStep({
  stepName: 'non-rent-arrears-dispute',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/nonRentArrearsDispute.njk`,
  translationKeys: {
    introParagraph: 'introParagraph',
    introLinkText: 'introLinkText',
    introLinkHref: 'introLinkHref',
    includesHeading: 'includesHeading',
    caption: 'captionHeading',
  },
  extendGetContent: (req: Request) => {
    // Pull dynamic claimantName from CCD (same as dispute-claim-interstitial)
    const claimantName = (req.session?.ccdCase?.data?.claimantName as string) || 'Treetops Housing';

    // Get the step-scoped translation function
    const t = getTranslationFunction(req, 'non-rent-arrears-dispute', ['common']);

    // Get the list and manually interpolate claimantName into each item
    const includesListRaw = t('includesList', { returnObjects: true }) as string[] | string;
    const includesList = Array.isArray(includesListRaw)
      ? includesListRaw.map(item => item.replace('{{claimantName}}', claimantName))
      : [];

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
