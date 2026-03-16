import type { Request } from 'express';

import type { PossessionClaimResponse } from '../../../interfaces/ccdCase.interface';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { buildCcdCaseForPossessionClaimResponse } from '../../utils/populateResponseToClaimPayloadmap';
import { flowConfig } from '../flow.config';

import { createFormStep } from '@modules/steps';

export const step: StepDefinition = createFormStep({
  stepName: 'defendant-name-confirmation',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  basePath: '/respond-to-claim',
  flowConfig,
  customTemplate: `${__dirname}/defendantNameConfirmation.njk`,
  beforeRedirect: async req => {
    const nameConfirmation = req.body?.nameConfirmation as string | undefined;

    if (!nameConfirmation || (nameConfirmation !== 'yes' && nameConfirmation !== 'no')) {
      return;
    }

    // Map to CCD enum (same logic as yesNoEnum)
    const defendantNameConfirmation = nameConfirmation === 'yes' ? 'YES' : 'NO';

    const party: Record<string, string> = {};

    if (nameConfirmation === 'no') {
      // User corrects name - read from subFields with dot-notation
      const firstName = req.body?.['nameConfirmation.firstName'] as string | undefined;
      const lastName = req.body?.['nameConfirmation.lastName'] as string | undefined;

      if (firstName && firstName.trim()) {
        party.firstName = firstName;
      }
      if (lastName && lastName.trim()) {
        party.lastName = lastName;
      }
    }

    if (nameConfirmation === 'yes') {
      // User confirms name - copy from claimant-entered details
      const caseData = req.res?.locals?.validatedCase?.data;
      const claimantEntry = caseData?.possessionClaimResponse?.claimantEnteredDefendantDetails;

      const firstName = claimantEntry?.firstName;
      const lastName = claimantEntry?.lastName;

      if (typeof firstName === 'string' && firstName.trim()) {
        party.firstName = firstName;
      }
      if (typeof lastName === 'string' && lastName.trim()) {
        party.lastName = lastName;
      }
    }

    // Build payload with dual paths
    const possessionClaimResponse: PossessionClaimResponse = {
      defendantResponses: {
        defendantNameConfirmation,
      },
      ...(Object.keys(party).length > 0 && {
        defendantContactDetails: {
          party,
        },
      }),
    };

    await buildCcdCaseForPossessionClaimResponse(req, possessionClaimResponse);
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
