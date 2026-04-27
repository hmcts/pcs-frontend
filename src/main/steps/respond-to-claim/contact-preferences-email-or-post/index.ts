import { isEmail } from 'validator';

import { createFormStep } from '../../../modules/steps';
import { buildDraftDefendantResponse, saveDraftDefendantResponse } from '../../utils/buildDraftDefendantResponse';
import { flowConfig } from '../flow.config';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

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
    const caseData = req.res?.locals?.validatedCase?.possessionClaimResponse;
    const preferenceType = caseData?.defendantResponses?.preferenceType as string | undefined;
    const emailAddress = caseData?.defendantContactDetails?.party?.emailAddress as string | undefined;

    const result: Record<string, unknown> = {};

    if (preferenceType === 'EMAIL') {
      result.contactByEmailOrPost = 'email';
      if (emailAddress) {
        result.email = emailAddress;
      }
    } else if (preferenceType === 'POST') {
      result.contactByEmailOrPost = 'post';
    }

    return result;
  },

  beforeRedirect: async req => {
    const response = buildDraftDefendantResponse(req);
    const contactByEmailOrPost = req.body?.contactByEmailOrPost as 'email' | 'post' | undefined;

    if (contactByEmailOrPost === 'email') {
      response.defendantResponses.preferenceType = 'EMAIL';
      const email = (req.body?.['contactByEmailOrPost.email'] as string | undefined)?.trim();
      if (email) {
        response.defendantContactDetails.party.emailAddress = email;
      } else {
        delete response.defendantContactDetails.party.emailAddress;
      }
    } else if (contactByEmailOrPost === 'post') {
      response.defendantResponses.preferenceType = 'POST';
      delete response.defendantContactDetails.party.emailAddress;
    } else {
      delete response.defendantResponses.preferenceType;
      delete response.defendantContactDetails.party.emailAddress;
    }

    await saveDraftDefendantResponse(req, response);
  },
});
