import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import { createFormStep } from '../../../modules/steps';
import { buildDraftDefendantResponse } from '../../utils/buildDraftDefendantResponse';
import { flowConfig } from '../flow.config';

import { ccdCaseService } from '@services/ccdCaseService';

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
    // Reads from session for now - session removal is a separate ticket
    const telephoneForm = req.session.formData?.['contact-preferences-telephone'];
    if (telephoneForm) {
      response.defendantResponses.contactByPhone = telephoneForm.contactByTelephone === 'yes' ? 'YES' : 'NO';

      if (telephoneForm.contactByTelephone === 'yes') {
        response.defendantContactDetails.party.phoneNumber = telephoneForm['contactByTelephone.phoneNumber'];
      } else {
        delete response.defendantContactDetails.party.phoneNumber;
      }
    } else {
      delete response.defendantResponses.contactByPhone;
      delete response.defendantContactDetails.party.phoneNumber;
    }

    await ccdCaseService.saveDraftDefendantResponse(
      req.session?.user?.accessToken,
      req.res?.locals.validatedCase?.id,
      response
    );
  },
});
