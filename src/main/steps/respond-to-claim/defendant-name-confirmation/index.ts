import type { Request } from 'express';

import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { flowConfig } from '../flow.config';

import { createFormStep } from '@modules/steps';

export const step: StepDefinition = createFormStep({
  stepName: 'defendant-name-confirmation',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  basePath: '/respond-to-claim',
  flowConfig,
  customTemplate: `${__dirname}/defendantNameConfirmation.njk`,
  translationKeys: {
    pageTitle: 'pageTitle',
    caption: 'caption',
    contactUs: 'contactUs',
  },
  getInitialFormData: (req: Request) => {
    const caseData = req.res?.locals?.validatedCase?.data;
    const defendantResponses = caseData?.possessionClaimResponse?.defendantResponses;
    const party = caseData?.possessionClaimResponse?.defendantContactDetails?.party;

    const existingAnswer = defendantResponses?.defendantNameConfirmation;
    const formValue = existingAnswer === 'YES' ? 'yes' : existingAnswer === 'NO' ? 'no' : undefined;

    if (!formValue) {
      return {};
    }

    if (formValue === 'yes') {
      return { nameConfirmation: 'yes' };
    }

    const initial: Record<string, unknown> = { nameConfirmation: 'no' };
    if (party?.firstName) {
      initial['nameConfirmation.firstName'] = party.firstName;
    }
    if (party?.lastName) {
      initial['nameConfirmation.lastName'] = party.lastName;
    }

    return initial;
  },
  extendGetContent: (req: Request) => {
    // Get defendant name from claimantEnteredDefendantDetails (what claimant entered)
    const caseData = req.res?.locals?.validatedCase?.data;
    const claimantEntry = caseData?.possessionClaimResponse?.claimantEnteredDefendantDetails;
    const defendantName =
      claimantEntry?.firstName && claimantEntry?.lastName ? `${claimantEntry.firstName} ${claimantEntry.lastName}` : '';

    // Get organisation name from CCD case data
    const organisationName = (caseData?.possessionClaimResponse?.claimantOrganisations?.[0]?.value as string) ?? '';

    return {
      defendantName,
      organisationName,
    };
  },
  fields: [
    {
      name: 'nameConfirmation',
      type: 'radio',
      required: true,
      translationKey: {
        label: 'nameConfirmationLabel',
      },
      legendClasses: 'govuk-fieldset__legend--l govuk-!-margin-bottom-6',
      options: [
        {
          value: 'yes',
          translationKey: 'yesOption',
        },
        {
          value: 'no',
          translationKey: 'noOption',
          subFields: {
            firstName: {
              name: 'firstName',
              type: 'text',
              required: true,
              maxLength: 60,
              errorMessage: 'errors.firstName',
              translationKey: {
                label: 'firstNameLabel',
              },
              labelClasses: 'govuk-label--s',
              attributes: {
                autocomplete: 'given-name',
                spellcheck: false,
              },
            },
            lastName: {
              name: 'lastName',
              type: 'text',
              required: true,
              maxLength: 60,
              errorMessage: 'errors.lastName',
              translationKey: {
                label: 'lastNameLabel',
              },
              labelClasses: 'govuk-label--s',
              attributes: {
                autocomplete: 'family-name',
                spellcheck: false,
              },
            },
          },
        },
      ],
    },
  ],
});
