import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { buildCcdCaseForPossessionClaimResponse as buildAndSubmitPossessionClaimResponse } from '../../utils/populateResponseToClaimPayloadmap';
import { flowConfig } from '../flow.config';

import type { PossessionClaimResponse } from '@interfaces/ccdCaseData.model';
import { createFormStep } from '@modules/steps';

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
