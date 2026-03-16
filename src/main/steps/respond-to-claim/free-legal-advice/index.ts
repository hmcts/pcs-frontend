import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { mapYesNoPreferNotToSay } from '../../../mappers/ccdMappers';
import { flowConfig } from '../flow.config';

import { createFormStep } from '@modules/steps';

export const step: StepDefinition = createFormStep({
  stepName: 'free-legal-advice',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/freeLegalAdvice.njk`,
  ccdMapping: {
    backendPath: 'possessionClaimResponse.defendantResponses',
    frontendField: 'hadLegalAdvice',
    valueMapper: mapYesNoPreferNotToSay('receivedFreeLegalAdvice'),
  },
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
  getInitialFormData: async req => {
    // Read from CCD (fresh data from START callback via res.locals.validatedCase)
    const caseData = req.res?.locals.validatedCase?.data;
    const existingAnswer = caseData?.possessionClaimResponse?.defendantResponses?.receivedFreeLegalAdvice;

    if (!existingAnswer) {
      return {};
    }

    // Map CCD enum to frontend value
    const formValue =
      existingAnswer === 'YES'
        ? 'yes'
        : existingAnswer === 'NO'
          ? 'no'
          : existingAnswer === 'PREFER_NOT_TO_SAY'
            ? 'preferNotToSay'
            : undefined;

    return formValue ? { hadLegalAdvice: formValue } : {};
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
});
