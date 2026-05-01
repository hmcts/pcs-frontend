import { flowConfig } from '../flow.config';

import { createFormStep } from '@modules/steps';
import { getDashboardUrl } from '@routes/dashboard';

export const step = createFormStep({
  stepName: 'start-now',
  journeyFolder: 'uploadAdditionalDocuments',
  stepDir: __dirname,
  flowConfig,
  extendGetContent: async req => ({
    backUrl: getDashboardUrl(req.res?.locals.validatedCase?.id) ?? '/dashboard',
  }),
  fields: [
    {
      name: 'documentsRelateToGeneralApplication',
      type: 'radio',
      required: true,
      translationKey: { label: 'question' },
      legendClasses: 'govuk-fieldset__legend--m',
      options: [
        { value: 'yes', translationKey: 'options.yes.label', hint: 'options.yes.hint' },
        { value: 'no', translationKey: 'options.no.label', hint: 'options.no.hint' },
      ],
    },
  ],
  translationKeys: {
    pageTitle: 'pageTitle',
    heading: 'heading',
  },
});
