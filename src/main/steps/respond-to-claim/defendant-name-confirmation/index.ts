import type { Request } from 'express';

import { buildCcdCaseForPossessionClaimResponse } from '../../utils/populateResponseToClaimPayloadmap';
import { flowConfig } from '../flow.config';

import { createFormStep } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import type { PossessionClaimResponse } from '@services/ccdCaseData.model';

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
      // User confirms name - clear any previously corrected names by sending empty strings
      party.firstName = '';
      party.lastName = '';
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
    const { defendantResponsesDefendantNameConfirmation: existingAnswer, defendantContactDetailsParty: party } = req.res
      ?.locals?.validatedCase ?? {
      defendantResponsesDefendantNameConfirmation: undefined,
      defendantContactDetailsParty: undefined,
    };

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
    const { claimantEnteredDefendantDetailsName, defendantContactDetailsPartyName, claimantName } = req.res?.locals
      ?.validatedCase ?? {
      claimantEnteredDefendantDetailsName: '',
      defendantContactDetailsPartyName: '',
      claimantName: '',
    };

    const defendantName = claimantEnteredDefendantDetailsName || defendantContactDetailsPartyName;
    const organisationName = claimantName || 'Treetops Housing';

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
      isPageHeading: true,
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
