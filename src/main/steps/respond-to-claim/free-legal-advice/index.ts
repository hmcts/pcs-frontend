import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createFormStep } from '../../../modules/steps';
import { flowConfig } from '../flow.config';

export const step: StepDefinition = createFormStep(
  {
    stepName: 'free-legal-advice',
    journeyFolder: 'respondToClaim',
    stepDir: __dirname,
    basePath: '/respond-to-claim',
    flowConfig,
    translationKeys: {
      pageTitle: 'pageTitle',
      heading: 'heading',
      caption: 'caption',
      subHeading1: 'subHeading1',
      paragraph1: 'paragraph1',
      listItem1: 'listItem1',
      listItem2: 'listItem2',
      listItem3: 'listItem3',
      listItem4: 'listItem4',
      paragraph2: 'paragraph2',
      bullet1: 'bullet1',
      bullet2: 'bullet2',
      subHeading2: 'subHeading2',
      paragraph3: 'paragraph3',
      paragraph4: 'paragraph4',
    },
    fields: [
      {
        name: 'hadLegalAdvice',
        type: 'radio',
        required: true,
        legendClasses: 'govuk-fieldset__legend--m',
        translationKey: {
          label: 'question',
        },
        options: [
          { value: 'yes', translationKey: 'options.yes' },
          { value: 'no', translationKey: 'options.no' },
          { divider: 'options.or' },
          { value: 'preferNotToSay', translationKey: 'options.preferNotToSay' },
        ],
      },
    ],
  },
  `${__dirname}/freeLegalAdvice.njk`
);
