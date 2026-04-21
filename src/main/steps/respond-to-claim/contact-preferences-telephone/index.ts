import { buildCcdCaseForPossessionClaimResponse as buildAndSubmitPossessionClaimResponse } from '../../utils/populateResponseToClaimPayloadmap';
import { flowConfig } from '../flow.config';

import { createFormStep } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import type { PossessionClaimResponse } from '@services/ccdCaseData.model';

export const step: StepDefinition = createFormStep({
  stepName: 'contact-preferences-telephone',
  journeyFolder: 'respondToClaim',
  showCancelButton: false,
  stepDir: __dirname,
  flowConfig,

  translationKeys: {
    caption: 'caption',
    pageTitle: 'pageTitle',
    heading: 'heading',
    content: 'subtitle',
  },
  fields: [
    {
      name: 'contactByTelephone',
      type: 'radio',
      required: true,
      legendClasses: 'govuk-!-font-weight-bold govuk-!-font-size-24',
      translationKey: {
        label: 'labels.question',
      },
      isPageHeading: false,
      options: [
        {
          value: 'yes',
          translationKey: 'labels.options.yes',

          subFields: {
            phoneNumber: {
              name: 'phoneNumber',
              type: 'text',
              required: true,
              errorMessage: 'errors.contactByTelephone.phoneNumber',
              labelClasses: 'govuk-!-font-weight-bold',
              translationKey: {
                label: 'labels.phoneNumberLabel',
              },
              attributes: {
                type: 'tel',
                autocomplete: 'tel',
              },
              validator: (value: unknown) => {
                const phone = (value as string)?.trim();

                const normalized = phone.replace(/\s+/g, '');

                const mobileRegex = /^07\d{9}$/;

                const landlineRegex = /^0[12]\d{8,9}$/;

                const businessRegex = /^0[389]\d{9}$/;

                if (mobileRegex.test(normalized) || landlineRegex.test(normalized) || businessRegex.test(normalized)) {
                  return true;
                }

                return 'errors.contactByTelephone.phoneNumber.invalid';
              },
            },
          },
        },
        {
          value: 'no',
          translationKey: 'labels.options.no',
        },
      ],
    },
  ],
  getInitialFormData: req => {
    const validatedCase = req.res?.locals?.validatedCase;
    const contactByPhone = validatedCase?.defendantResponsesContactByPhone;
    const phoneNumber = validatedCase?.defendantContactDetailsPartyPhoneNumber;

    if (contactByPhone === 'YES') {
      return {
        contactByTelephone: 'yes',
        ...(phoneNumber ? { 'contactByTelephone.phoneNumber': phoneNumber } : {}),
      };
    }

    if (contactByPhone === 'NO') {
      return {
        contactByTelephone: 'no',
      };
    }

    return {};
  },

  beforeRedirect: async req => {
    const telephoneForm = req.body as Record<string, unknown>;
    const contactByTelephone = telephoneForm.contactByTelephone as string | undefined;

    if (!contactByTelephone) {
      return;
    }

    const existingPhoneNumber = req.res?.locals?.validatedCase?.defendantContactDetailsPartyPhoneNumber as
      | string
      | undefined;

    const possessionClaimResponse: PossessionClaimResponse = {
      defendantContactDetails: {
        party: {
          phoneNumberProvided: contactByTelephone === 'yes' ? 'YES' : 'NO',
          phoneNumber:
            contactByTelephone === 'yes'
              ? (telephoneForm['contactByTelephone.phoneNumber'] as string | undefined)
              : existingPhoneNumber
              ? ''
              : undefined,
        },
      },
      defendantResponses: {
        contactByPhone: contactByTelephone === 'yes' ? 'YES' : 'NO',
      },
    };

    await buildAndSubmitPossessionClaimResponse(req, possessionClaimResponse);
  },
});
