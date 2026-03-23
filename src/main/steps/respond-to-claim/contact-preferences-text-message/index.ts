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
  getInitialFormData: req => {
    const contactByText = req.res?.locals?.validatedCase?.defendantResponsesContactByText;

    if (contactByText === 'YES') {
      return { contactByTextMessage: 'yes' };
    }

    if (contactByText === 'NO') {
      return { contactByTextMessage: 'no' };
    }

    return {};
  },
  beforeRedirect: async req => {
    const textForm = req.body as Record<string, unknown>;
    const contactByTextMessage = textForm.contactByTextMessage as string | undefined;

    if (!contactByTextMessage) {
      return;
    }

    const possessionClaimResponse: PossessionClaimResponse = {
      defendantResponses: {
        contactByText: contactByTextMessage === 'yes' ? 'YES' : 'NO',
      },
    };

    await buildAndSubmitPossessionClaimResponse(req, possessionClaimResponse);
  },
});
