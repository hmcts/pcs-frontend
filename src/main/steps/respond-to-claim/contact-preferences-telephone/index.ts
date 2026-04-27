import { createFormStep } from '../../../modules/steps';
import { buildDraftDefendantResponse, saveDraftDefendantResponse } from '../../utils/buildDraftDefendantResponse';
import { flowConfig } from '../flow.config';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

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

  beforeRedirect: async req => {
    const response = buildDraftDefendantResponse(req);
    const contactByTelephone = req.body?.contactByTelephone as 'yes' | 'no' | undefined;

    if (contactByTelephone === 'yes') {
      response.defendantResponses.contactByPhone = 'YES';
      const phoneNumber = (req.body?.['contactByTelephone.phoneNumber'] as string | undefined)?.trim();
      if (phoneNumber) {
        response.defendantContactDetails.party.phoneNumber = phoneNumber;
      } else {
        delete response.defendantContactDetails.party.phoneNumber;
      }
    } else if (contactByTelephone === 'no') {
      response.defendantResponses.contactByPhone = 'NO';
      delete response.defendantContactDetails.party.phoneNumber;
    } else {
      delete response.defendantResponses.contactByPhone;
      delete response.defendantContactDetails.party.phoneNumber;
    }

    await saveDraftDefendantResponse(req, response);
  },
});
