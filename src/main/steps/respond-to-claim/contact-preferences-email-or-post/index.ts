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
      type: 'checkbox',
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

    const formData: Record<string, unknown> = {};
    const selected: string[] = [];

    if (validatedCase?.defendantResponsesContactByEmail === 'YES') {
      selected.push('email');
    }
    if (validatedCase?.defendantResponsesContactByPost === 'YES') {
      selected.push('post');
    }

    if (selected.length > 0) {
      formData.contactByEmailOrPost = selected;
    }
    if (existingEmail && selected.includes('email')) {
      formData['contactByEmailOrPost.email'] = existingEmail;
    }

    return formData;
  },

  beforeRedirect: async req => {
    const emailForm = req.body as Record<string, unknown>;

    const selectedRaw = emailForm.contactByEmailOrPost as string | string[] | undefined;
    const selected = Array.isArray(selectedRaw) ? selectedRaw : selectedRaw ? [selectedRaw] : [];
    const emailSelected = selected.includes('email');
    const postSelected = selected.includes('post');

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
      },
    };

    await buildAndSubmitPossessionClaimResponse(req, possessionClaimResponse);
  },
});
