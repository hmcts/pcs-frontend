import { isEmail } from 'validator';

import { buildDraftDefendantResponse, saveDraftDefendantResponse } from '../../utils/buildDraftDefendantResponse';
import { createRespondToClaimFormStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createRespondToClaimFormStep({
  stepName: 'contact-preferences-email-or-post',
  showCancelButton: false,
  stepDir: __dirname,

  translationKeys: {
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
    const caseData = req.res?.locals?.validatedCase?.possessionClaimResponse;
    const defendantResponses = caseData?.defendantResponses;
    const emailAddress = caseData?.defendantContactDetails?.party?.emailAddress;

    const formData: Record<string, unknown> = {};
    const selected: string[] = [];

    if (defendantResponses?.contactByEmail === 'YES') {
      selected.push('email');
    }
    if (defendantResponses?.contactByPost === 'YES') {
      selected.push('post');
    }

    if (selected.length > 0) {
      formData.contactByEmailOrPost = selected;
    }
    if (selected.includes('email') && emailAddress) {
      formData['contactByEmailOrPost.email'] = emailAddress;
    }

    return formData;
  },

  beforeRedirect: async req => {
    const response = buildDraftDefendantResponse(req);
    const emailForm = req.body as Record<string, unknown>;
    const selectedRaw = emailForm.contactByEmailOrPost as string | string[] | undefined;
    const selected = Array.isArray(selectedRaw) ? selectedRaw : selectedRaw ? [selectedRaw] : [];
    const emailSelected = selected.includes('email');
    const postSelected = selected.includes('post');

    response.defendantResponses.contactByEmail = emailSelected ? 'YES' : 'NO';
    response.defendantResponses.contactByPost = postSelected ? 'YES' : 'NO';

    if (emailSelected) {
      const email = (emailForm['contactByEmailOrPost.email'] as string | undefined)?.trim();
      if (email) {
        response.defendantContactDetails.party.emailAddress = email;
      } else {
        delete response.defendantContactDetails.party.emailAddress;
      }
    } else {
      delete response.defendantContactDetails.party.emailAddress;
    }

    await saveDraftDefendantResponse(req, response);
  },
});
