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
      caption: 'caption',
      pageTitle: 'pageTitle',
      question: 'question',
      hintText: 'hintText',
    },
    fields: [
      {
        name: 'confirmNoticeGiven',
        type: 'radio',
        required: true,
        translationKey: { label: 'question', hint: 'hintText' },
        legendClasses: 'govuk-fieldset__legend--m',
        options: [
          { value: 'yes', translationKey: 'options.yes' },
          { value: 'no', translationKey: 'options.no' },
          { divider: 'options.or' },
          { value: 'imNotSure', translationKey: 'options.imNotSure' },
        ],
      },
    ],
    extendGetContent: req => {
      const claimantName = req.session?.ccdCase?.data?.claimantName || 'Treetops Housing';

      return {
        claimantName,
      };
    },
  },
  `${__dirname}/confirmationOfNoticeGiven.njk`
);
