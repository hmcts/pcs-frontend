import { isEmail } from 'validator';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import { createFormStep } from '../../../modules/steps';
import { buildDraftDefendantResponse } from '../../utils/buildDraftDefendantResponse';
import { flowConfig } from '../flow.config';

import { ccdCaseService } from '@services/ccdCaseService';

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

  beforeRedirect: async req => {
    const response = buildDraftDefendantResponse(req);
    // Reads from session for now - session removal is a separate ticket
    const emailForm = req.session.formData?.['contact-preferences-email-or-post'];
    if (emailForm) {
      const emailSelected = emailForm.contactByEmailOrPost === 'email';
      response.defendantResponses.preferenceType = emailSelected ? 'EMAIL' : 'POST';

      if (emailSelected) {
        response.defendantContactDetails.party.emailAddress = emailForm['contactByEmailOrPost.email'];
      } else {
        delete response.defendantContactDetails.party.emailAddress;
      }
    } else {
      delete response.defendantResponses.preferenceType;
      delete response.defendantContactDetails.party.emailAddress;
    }

    await ccdCaseService.saveDraftDefendantResponse(
      req.session?.user?.accessToken,
      req.res?.locals.validatedCase?.id,
      response
    );
  },
});
