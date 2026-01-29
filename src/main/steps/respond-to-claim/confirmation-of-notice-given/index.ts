import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createFormStep } from '../../../modules/steps';
import { flowConfig } from '../flow.config';

export const step: StepDefinition = createFormStep(
  {
    stepName: 'confirmation-of-notice-given',
    journeyFolder: 'respondToClaim',
    stepDir: __dirname,
    flowConfig,
    translationKeys: {
      pageTitle: 'pageTitle',
      subTitle: 'subTitle',
      hintText: 'hintText',
      caption: 'caption',
    },
    fields: [
      {
        name: 'confirmNoticeGiven',
        type: 'radio',
        required: true,
        translationKey: { label: 'subTitle', hint: 'hintText' },
        legendClasses: 'govuk-fieldset__legend--m',
        options: [
          { value: 'yes', translationKey: 'options.yes' },
          { value: 'no', translationKey: 'options.no' },
          { divider: 'options.or' },
          { value: 'imNotSure', translationKey: 'options.imNotSure' },
        ],
      },
    ],
    extendGetContent: req => ({
      claimantName: req.session?.ccdCase?.data?.claimantName || 'Treetops Housing',
    }),
  },
  `${__dirname}/confirmationOfNoticeGiven.njk`
);
