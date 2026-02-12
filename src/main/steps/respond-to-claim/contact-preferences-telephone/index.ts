import { isMobilePhone } from 'validator';

import type { PossessionClaimResponse } from '../../../interfaces/ccdCase.interface';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createFormStep } from '../../../modules/steps';
import { buildCcdCaseForPossessionClaimResponse as buildAndSubmitPossessionClaimResponse } from '../../utils/populateResponseToClaimPayloadmap';
import { flowConfig } from '../flow.config';

export const step: StepDefinition = createFormStep({
  stepName: 'contact-preferences-telephone',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,

  translationKeys: {
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
      options: [
        {
          value: 'yes',
          translationKey: 'labels.options.yes',

          subFields: {
            phoneNumber: {
              name: 'phoneNumber',
              type: 'text',
              required: true,
              translationKey: {
                label: 'labels.phoneNumberLabel',
              },
              attributes: {
                type: 'tel',
                autocomplete: 'tel',
              },
              validator: (value: unknown) => {
                if (!isMobilePhone(value as string, 'en-GB')) {
                  return 'errors.contactByTelephone.phoneNumber.invalid';
                }
                return true;
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
    const telephoneForm = req.session.formData?.['contact-preferences-telephone'];
    if (!telephoneForm) {
      return;
    }

    const possessionClaimResponse: PossessionClaimResponse = {
      contact_preferences: {
        contact_by_phone: telephoneForm.contactByTelephone === 'yes' ? 'Yes' : 'No',
      },
    };

    await buildAndSubmitPossessionClaimResponse(req, possessionClaimResponse, false);
  },
});
