import { createFormStep, getTranslationFunction } from '../../../modules/steps';
import { flowConfig } from '../flow.config';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import { isGenAppCuiSetAsideEnabled } from '@utils/isGenAppCuiSetAsideEnabled';

export const step: StepDefinition = createFormStep({
  stepName: 'is-the-court-hearing-in-the-next-14-days',
  journeyFolder: 'makeAnApplication',
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/isTheCourtHearingInTheNext14Days.njk`,
  fields: [
    {
      name: 'hearingInNext14Days',
      type: 'radio',
      required: true,
      errorMessage: 'errors.inNext14Days',
      translationKey: { label: 'question', hint: 'hintText' },
      legendClasses: 'govuk-fieldset__legend--m',
      options: [
        {
          value: 'yes',
          translationKey: 'options.yes',
        },
        {
          value: 'no',
          translationKey: 'options.no',
        },
      ],
    },
  ],
  extendGetContent: (req, content) => {
    const genAppCuiSetAsideEnabled = isGenAppCuiSetAsideEnabled(req);
    const field = content.fields.find(item => item.componentType === 'radios');
    if (field?.component) {
      field.component.hint = {
        text: getTranslationFunction(req)(genAppCuiSetAsideEnabled ? 'genAppCuiSetAside.hintText' : 'hintText'),
      };
    }
    return { genAppCuiSetAsideEnabled };
  },
  translationKeys: {
    pageTitle: 'pageTitle',
    caption: 'caption',
    heading: 'heading',
    otherParties: 'otherParties',
    everyOtherPartyWillNeedToAgree: 'everyOtherPartyWillNeedToAgree',
  },
});
