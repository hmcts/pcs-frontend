import type { PossessionClaimResponse } from '../../../interfaces/ccdCase.interface';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createFormStep } from '../../../modules/steps';
import { buildCcdCaseForPossessionClaimResponse as buildAndSubmitPossessionClaimResponse } from '../../utils/populateResponseToClaimPayloadmap';
import { flowConfig } from '../flow.config';

export const step: StepDefinition = createFormStep({
  stepName: 'contact-preferences-text-message',
  journeyFolder: 'respondToClaim',
  showCancelButton: false,
  stepDir: __dirname,
  flowConfig,

  translationKeys: {
    caption: 'caption',
    heading: 'heading',
    pageTitle: 'pageTitle',
    content: 'subtitle',
  },

  getInitialFormData: req => {
    const caseData = req.res?.locals.validatedCase?.data;
    const possessionClaimResponse = caseData?.possessionClaimResponse;
    const contactByText = possessionClaimResponse?.defendantResponses?.contactByText;

    if (!contactByText) {
      return {};
    }

    return {
      ...(contactByText ? { contactByTextMessage: contactByText === 'YES' ? 'yes' : 'no' } : {}),
    };
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
      defendantResponses: {
        contactByText: textForm.contactByTextMessage === 'yes' ? 'YES' : 'NO',
      },
    };

    await buildAndSubmitPossessionClaimResponse(req, possessionClaimResponse);
  },
});
