import { buildDraftDefendantResponse, saveDraftDefendantResponse } from '../../utils/buildDraftDefendantResponse';
import { createRespondToClaimFormStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createRespondToClaimFormStep({
  stepName: 'contact-preferences-text-message',
  isAnswered: req => Boolean(req.res?.locals.validatedCase?.defendantResponses?.contactByText),
  showCancelButton: false,
  stepDir: __dirname,

  translationKeys: {
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

          subFields: {
            mobileNumber: {
              name: 'mobileNumber',
              type: 'text',
              required: true,
              errorMessage: 'errors.contactByTextMessage.mobileNumber',
              labelClasses: 'govuk-!-font-weight-bold',
              translationKey: {
                label: 'mobileNumberLabel',
              },
              attributes: {
                type: 'tel',
                autocomplete: 'tel',
              },
              validator: (value: unknown) => {
                const normalized = (value as string)?.trim().replace(/\s+/g, '');

                // UK mobile numbers only (07xxxxxxxxx) so a textable number is always captured.
                const mobileRegex = /^07\d{9}$/;

                if (mobileRegex.test(normalized)) {
                  return true;
                }

                return 'errors.contactByTextMessage.mobileNumber.invalid';
              },
            },
          },
        },
        {
          value: 'no',
          translationKey: 'options.no',
        },
      ],
    },
  ],

  getInitialFormData: req => {
    const caseData = req.res?.locals.validatedCase?.possessionClaimResponse;
    const contactByText = caseData?.defendantResponses?.contactByText as string | undefined;
    const mobileNumber = caseData?.defendantContactDetails?.party?.textMessageNumber as string | undefined;

    const result: Record<string, unknown> = {};

    if (contactByText === 'YES') {
      result.contactByTextMessage = 'yes';
      if (mobileNumber) {
        result['contactByTextMessage.mobileNumber'] = mobileNumber;
      }
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
      const mobileNumber = (req.body?.['contactByTextMessage.mobileNumber'] as string | undefined)?.trim();
      if (mobileNumber) {
        response.defendantContactDetails.party.textMessageNumber = mobileNumber;
      } else {
        delete response.defendantContactDetails.party.textMessageNumber;
      }
    } else if (contactByTextMessage === 'no') {
      response.defendantResponses.contactByText = 'NO';
      delete response.defendantContactDetails.party.textMessageNumber;
    } else {
      delete response.defendantResponses.contactByText;
      delete response.defendantContactDetails.party.textMessageNumber;
    }

    await saveDraftDefendantResponse(req, response);
  },
});
