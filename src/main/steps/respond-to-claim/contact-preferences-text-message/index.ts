import { buildDraftDefendantResponse, saveDraftDefendantResponse } from '../../utils/buildDraftDefendantResponse';
import { createRespondToClaimFormStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

// UK mobile numbers only (07xxxxxxxxx) so a textable number is always captured.
const UK_MOBILE_REGEX = /^07\d{9}$/;

export const validateMobileNumber = (value: unknown): true | string => {
  const normalized = (value as string)?.trim().replace(/\s+/g, '');

  if (UK_MOBILE_REGEX.test(normalized)) {
    return true;
  }

  return 'errors.contactByTextMessage.mobileNumber.invalid';
};

export const step: StepDefinition = createRespondToClaimFormStep({
  stepName: 'contact-preferences-text-message',
  isAnswered: req => {
    const validatedCase = req.res?.locals.validatedCase;
    const contactByText = validatedCase?.defendantResponses?.contactByText;
    if (contactByText === 'NO') {
      return true;
    }
    // "Yes" is only complete once a textable mobile number has actually been captured.
    const mobileNumber = validatedCase?.possessionClaimResponse?.defendantContactDetails?.party?.textMessageNumber;
    return contactByText === 'YES' && Boolean(mobileNumber);
  },
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
              validator: validateMobileNumber,
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
      // Store the same normalised digits-only value the validator accepted (strip all spaces).
      const mobileNumber = (req.body?.['contactByTextMessage.mobileNumber'] as string | undefined)
        ?.trim()
        .replace(/\s+/g, '');
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
