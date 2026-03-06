import type { Request } from 'express';

import type { CcdMappingContext, FormFieldValue } from '../../../interfaces/formFieldConfig.interface';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { yesNoEnum } from '../../../middleware/autoSaveDraftToCCD';
import { flowConfig } from '../flow.config';

import { createFormStep } from '@modules/steps';

export const step: StepDefinition = createFormStep({
  stepName: 'defendant-name-confirmation',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  basePath: '/respond-to-claim',
  flowConfig,
  customTemplate: `${__dirname}/defendantNameConfirmation.njk`,
  ccdMapping: {
    backendPath: 'possessionClaimResponse',
    // Extract parent field and both subFields (using dot-notation for nested field names)
    frontendFields: ['nameConfirmation', 'nameConfirmation.firstName', 'nameConfirmation.lastName'],
    // Custom mapper handles two scenarios:
    // 1. User confirms name is correct (yes) - copy claimant-entered values from CCD
    // 2. User corrects name (no) - save their manually entered values
    valueMapper: (valueOrFormData: FormFieldValue, ctx?: CcdMappingContext) => {
      if (typeof valueOrFormData === 'string' || Array.isArray(valueOrFormData)) {
        return {};
      }

      const formData = valueOrFormData as Record<string, unknown>;
      const nameConfirmation = formData.nameConfirmation;

      if (nameConfirmation !== 'yes' && nameConfirmation !== 'no') {
        return {};
      }

      const mappedAnswer = yesNoEnum('defendantNameConfirmation')(nameConfirmation);
      const defendantNameConfirmation = mappedAnswer.defendantNameConfirmation;

      const defendantResponses: Record<string, unknown> = {};
      if (defendantNameConfirmation) {
        defendantResponses.defendantNameConfirmation = defendantNameConfirmation;
      }

      const party: Record<string, unknown> = {};
      if (nameConfirmation === 'no') {
        const firstName = formData['nameConfirmation.firstName'];
        const lastName = formData['nameConfirmation.lastName'];
        if (typeof firstName === 'string' && firstName.trim()) {
          party.firstName = firstName;
        }
        if (typeof lastName === 'string' && lastName.trim()) {
          party.lastName = lastName;
        }
      }

      if (nameConfirmation === 'yes') {
        // When user confirms name is correct, copy what the claimant originally entered
        // Need to read from CCD context since this data isn't in the form submission
        const caseData = ctx?.caseData as Record<string, unknown> | undefined;
        const possessionClaimResponse = caseData?.possessionClaimResponse as Record<string, unknown> | undefined;
        const claimantEntry = possessionClaimResponse?.claimantEnteredDefendantDetails as
          | Record<string, unknown>
          | undefined;

        const firstName = claimantEntry?.firstName;
        const lastName = claimantEntry?.lastName;
        if (typeof firstName === 'string' && firstName.trim()) {
          party.firstName = firstName;
        }
        if (typeof lastName === 'string' && lastName.trim()) {
          party.lastName = lastName;
        }
      }

      const result: Record<string, unknown> = {};
      if (Object.keys(defendantResponses).length > 0) {
        result.defendantResponses = defendantResponses;
      }
      if (Object.keys(party).length > 0) {
        result.defendantContactDetails = { party };
      }

      return result;
    },
  },
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
    // Provides dynamic values for the template (defendant name and organization name)
    // These get interpolated into the question text and hint translations
    const caseData = req.res?.locals?.validatedCase?.data;
    const claimantEntry = caseData?.possessionClaimResponse?.claimantEnteredDefendantDetails;
    const defendantName =
      claimantEntry?.firstName && claimantEntry?.lastName ? `${claimantEntry.firstName} ${claimantEntry.lastName}` : '';

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
