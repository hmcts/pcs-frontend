import { buildDraftDefendantResponse, saveDraftDefendantResponse } from '../../utils/buildDraftDefendantResponse';
import { flowConfig } from '../flow.config';

import { createFormStep } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';

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
    const caseData = req.res?.locals?.validatedCase?.possessionClaimResponse;
    const contactByText = caseData?.defendantResponses?.contactByText as string | undefined;

    const result: Record<string, unknown> = {};

    if (contactByText === 'YES') {
      result.contactByTextMessage = 'yes';
    } else if (contactByText === 'NO') {
      result.contactByTextMessage = 'no';
    }

    return result;
  },

  beforeRedirect: async req => {
    const response = buildDraftDefendantResponse(req);
    const contactByTextMessage = req.body?.contactByTextMessage as 'yes' | 'no' | undefined;

    if (contactByTextMessage === 'yes') {
      response.defendantResponses.contactByText = 'YES';
    } else if (contactByTextMessage === 'no') {
      response.defendantResponses.contactByText = 'NO';
    } else {
      delete response.defendantResponses.contactByText;
    }

    await saveDraftDefendantResponse(req, response);
  },
});
