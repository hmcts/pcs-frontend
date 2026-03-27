import { isEmail } from 'validator';

import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createFormStep } from '../../../modules/steps';
import { buildCcdCaseForPossessionClaimResponse as buildAndSubmitPossessionClaimResponse } from '../../utils/populateResponseToClaimPayloadmap';
import { flowConfig } from '../flow.config';

import type { PossessionClaimResponse } from '@interfaces/ccdCaseData.model';

export const step: StepDefinition = createFormStep({
  stepName: 'contact-preferences-email-or-post',
  journeyFolder: 'respondToClaim',
  showCancelButton: false,
  stepDir: __dirname,
  flowConfig,

  translationKeys: {
    caption: 'caption',
    pageTitle: 'pageTitle',
    title: 'title',
    content: 'content',
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
              labelClasses: 'govuk-!-font-weight-bold',
              classes: 'govuk-input govuk-input--width-10',
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
  getInitialFormData: req => {
    const validatedCase = req.res?.locals?.validatedCase;
    const existingEmail = validatedCase?.defendantContactDetailsPartyEmailAddress;
    const preferenceType = validatedCase?.defendantResponsesPreferenceType;

    if (
      preferenceType === 'EMAIL' ||
      validatedCase?.defendantResponsesContactByEmail === 'YES' ||
      (typeof existingEmail === 'string' && existingEmail.trim().length > 0)
    ) {
      return {
        contactByEmailOrPost: 'email',
        ...(existingEmail ? { 'contactByEmailOrPost.email': existingEmail } : {}),
      };
    }

    if (preferenceType === 'POST' || validatedCase?.defendantResponsesContactByPost === 'YES') {
      return {
        contactByEmailOrPost: 'post',
      };
    }

    return {};
  },

  beforeRedirect: async req => {
    const emailForm = req.body as Record<string, unknown>;

    const emailSelected = emailForm.contactByEmailOrPost === 'email';
    const postSelected = emailForm.contactByEmailOrPost === 'post';

    if (!emailSelected && !postSelected) {
      return;
    }

    const existingEmailAddress = req.res?.locals?.validatedCase?.defendantContactDetailsPartyEmailAddress;

    const possessionClaimResponse: PossessionClaimResponse = {
      defendantContactDetails: {
        party: {
          emailAddress: emailSelected
            ? (emailForm['contactByEmailOrPost.email'] as string | undefined)
            : existingEmailAddress
              ? ''
              : undefined,
        },
      },
      defendantResponses: {
        contactByEmail: emailSelected ? 'YES' : 'NO',
        contactByPost: postSelected ? 'YES' : 'NO',
        preferenceType: emailSelected ? 'EMAIL' : postSelected ? 'POST' : undefined,
      },
    };

    await buildAndSubmitPossessionClaimResponse(req, possessionClaimResponse);
  },
});
