import { isEmail } from 'validator';

import type { PossessionClaimResponse } from '../../../interfaces/ccdCase.interface';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createFormStep } from '../../../modules/steps';
import { buildCcdCaseForPossessionClaimResponse as buildAndSubmitPossessionClaimResponse } from '../../utils/populateResponseToClaimPayloadmap';
import { flowConfig } from '../flow.config';

export const step: StepDefinition = createFormStep({
  stepName: 'contact-preferences-email-or-post',
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
      name: 'contactByEmailOrPost',
      type: 'radio',
      required: true,
      legendClasses: 'govuk-!-font-weight-bold govuk-!-font-size-24',
      translationKey: {
        label: 'labels.question',
      },
      options: [
        {
          value: 'email',
          translationKey: 'labels.options.byEmail',

          subFields: {
            email: {
              name: 'email',
              type: 'text',
              required: true,
              translationKey: {
                label: 'labels.emailLabel',
              },
              attributes: {
                type: 'email',
                autocomplete: 'email',
              },
              validator: (value: unknown) => {
                if (!isEmail(value as string)) {
                  return 'errors.contactByEmailOrPost.email.invalid';
                }
                return true;
              },
            },
          },
        },
        {
          value: 'post',
          translationKey: 'labels.options.byPost',
        },
      ],
    },
  ],

  beforeRedirect: async req => {
    const emailForm = req.session.formData?.['contact-preferences-email-or-post'];
    if (!emailForm) {
      return;
    }

    const emailSelected = emailForm.contactByEmailOrPost === 'email';
    const postSelected = emailForm.contactByEmailOrPost === 'post';

    const possessionClaimResponse: PossessionClaimResponse = {
      defendantContactDetails: {
        party: {
          emailAddress: emailSelected ? emailForm['contactByEmailOrPost.email'] : undefined,
        },
      },
      defendantResponses: {
        contactByEmail: emailSelected ? 'YES' : 'NO',
        contactByPost: postSelected ? 'YES' : 'NO',
      },
    };

    await buildAndSubmitPossessionClaimResponse(req, possessionClaimResponse, false);
  },
});
