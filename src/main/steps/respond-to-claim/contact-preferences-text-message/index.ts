import type { PossessionClaimResponse } from '../../../interfaces/ccdCase.interface';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createFormStep } from '../../../modules/steps';
import { buildCcdCaseForPossessionClaimResponse as buildAndSubmitPossessionClaimResponse } from '../../utils/populateResponseToClaimPayloadmap';
import { flowConfig } from '../flow.config';

export const step: StepDefinition = createFormStep({
  stepName: 'contact-preferences-text-message',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,

  translationKeys: {
    pageTitle: 'pageTitle',
    content: 'subtitle',
  },

  fields: [
    {
      name: 'contactByTextMessage',
      type: 'radio',
      required: true,
      legendClasses: 'govuk-!-font-weight-bold govuk-!-font-size-24',
      translationKey: {
        label: 'question',
      },
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
  beforeRedirect: async req => {
    const textForm = req.session.formData?.['contact-preferences-text-message'];
    if (!textForm) {
      return;
    }

    const possessionClaimResponse: PossessionClaimResponse = {
      contact_preferences: {
        contact_by_text: textForm.contactByTextMessage === 'yes' ? 'Yes' : 'No',
      },
    };

    buildAndSubmitPossessionClaimResponse(req, possessionClaimResponse, false);
  },
});
