import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { flowConfig } from '../flow.config';

import { createFormStep, getTranslationFunction } from '@modules/steps';

export const step: StepDefinition = createFormStep({
  stepName: 'installment-payments',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/instalmentOffer.njk`,
  translationKeys: {
    pageTitle: 'pageTitle',
    caption: 'caption',
    heading: 'heading',
    paragraph1: 'paragraph1',
    paragraph2: 'paragraph2',
    paragraph3: 'paragraph3',
    paragraph4: 'paragraph4',
    question: 'question',
  },
  fields: [
    {
      name: 'confirmInstallmentOffer',
      type: 'radio',
      required: true,
      legendClasses: 'govuk-fieldset__legend--m',
      translationKey: { label: 'question' },
      options: [
        { value: 'yes', translationKey: 'options.yes' },
        { value: 'no', translationKey: 'options.no' },
      ],
    },
  ],
  extendGetContent: req => {
    const caseData = req.res?.locals?.validatedCase?.data as { claimantName?: string } | undefined;
    const claimantName = caseData?.claimantName || 'Treetops Housing';

    // The locale `paragraph1` includes i18next interpolation placeholders (e.g. {{claimantName}}).
    // The generic formBuilder translationKeys translation does not pass interpolation, so we
    // compute the final string here to avoid showing literal `{{...}}` in the template.
    const t = getTranslationFunction(req, 'installment-payments', ['common']);

    return {
      claimantName,
      paragraph1: t('paragraph1', { claimantName }),
    };
  },
});
