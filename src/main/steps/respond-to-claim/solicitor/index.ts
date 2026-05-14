import { createRespondToClaimFormStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import { safeRedirect303 } from '@utils/safeRedirect';

export const step: StepDefinition = createRespondToClaimFormStep({
  stepName: 'solicitor',
  stepDir: __dirname,
  customTemplate: `${__dirname}/solicitor.njk`,
  translationKeys: {
    pageTitle: 'pageTitle',
    heading: 'heading',
    caption: 'caption',
  },
  fields: [
    {
      name: 'hasSolicitor',
      type: 'radio',
      required: true,
      legendClasses: 'govuk-fieldset__legend--l',
      translationKey: {
        label: 'question',
      },
      options: [
        { value: 'YES', translationKey: 'options.yes' },
        { value: 'NO', translationKey: 'options.no' },
      ],
    },
  ],
  beforeRedirect: async req => {
    if (req.body?.hasSolicitor === 'YES') {
      const caseReference = req.params?.caseReference;
      safeRedirect303(
        req.res!,
        `/case/${caseReference}/respond-to-claim/ask-your-solicitor-to-respond-to-the-claim`,
        '/',
        ['/']
      );
    }
  },
});
