import { isEmail } from 'validator';

import { buildDraftDefendantResponse, saveDraftDefendantResponse } from '../../utils/buildDraftDefendantResponse';
import { createRespondToClaimFormStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createRespondToClaimFormStep({
  stepName: 'email-confirmation',
  isAnswered: req => Boolean(req.res?.locals.validatedCase?.defendantResponses?.contactByEmail),
  stepDir: __dirname,
  beforeRedirect: async req => {
    const emailConfirmation = req.body?.emailConfirmation as string | undefined;
    const response = buildDraftDefendantResponse(req);

    if (emailConfirmation === 'yes' || emailConfirmation === 'no') {
      response.defendantResponses.contactByEmail = emailConfirmation === 'yes' ? 'YES' : 'NO';

      if (emailConfirmation === 'yes') {
        const emailAddress = req.body?.['emailConfirmation.emailAddress'] as string | undefined;
        if (emailAddress?.trim()) {
          response.defendantContactDetails.party.emailAddress = emailAddress;
        }
      } else {
        delete response.defendantContactDetails.party.emailAddress;
      }
    } else {
      delete response.defendantResponses.contactByEmail;
      delete response.defendantContactDetails.party.emailAddress;
    }

    await saveDraftDefendantResponse(req, response);
  },
  translationKeys: {
    pageTitle: 'pageTitle',
    heading: 'heading',
  },
  fields: [
    {
      name: 'emailConfirmation',
      type: 'radio',
      required: true,
      legendClasses: 'govuk-!-font-weight-bold govuk-!-font-size-24',
      translationKey: {
        label: 'emailConfirmationLabel',
      },
      isPageHeading: true,
      options: [
        {
          value: 'yes',
          translationKey: 'options.yes',
          subFields: {
            emailAddress: {
              name: 'emailAddress',
              type: 'text',
              required: true,
              translationKey: {
                label: 'emailLabel',
              },
              labelClasses: 'govuk-label--s',
              attributes: {
                type: 'email',
                autocomplete: 'email',
              },
              validator: (value: unknown) => {
                if (!isEmail(value as string)) {
                  return 'errors.emailAddress.invalid';
                }
                return true;
              },
            },
          },
        },
        {
          value: 'no',
          translationKey: 'options.no',
        },
      ],
    },
  ],
  getInitialFormData: req => {
    const caseData = req.res?.locals.validatedCase?.data?.possessionClaimResponse;
    const defendantResponses = caseData?.defendantResponses;
    const party = caseData?.defendantContactDetails?.party;

    const existingAnswer = defendantResponses?.contactByEmail;
    const formValue = existingAnswer === 'YES' ? 'yes' : existingAnswer === 'NO' ? 'no' : undefined;

    if (!formValue) {
      return {};
    }

    if (formValue === 'no') {
      return { emailConfirmation: 'no' };
    }

    const initial: Record<string, unknown> = { emailConfirmation: 'yes' };
    if (party?.emailAddress) {
      initial['emailConfirmation.emailAddress'] = party.emailAddress;
    }
    return initial;
  },
});
