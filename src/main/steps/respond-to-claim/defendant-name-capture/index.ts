import type { PossessionClaimResponse } from '../../../interfaces/ccdCase.interface';
import { buildCcdCaseForPossessionClaimResponse } from '../../utils/populateResponseToClaimPayloadmap';
import { flowConfig } from '../flow.config';

import type { StepDefinition } from '@interfaces/stepFormData.interface';
import { createFormStep } from '@modules/steps';

export const step: StepDefinition = createFormStep({
  stepName: 'defendant-name-capture',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  showCancelButton: false,
  beforeRedirect: async req => {
    const firstName = req.body?.firstName as string | undefined;
    const lastName = req.body?.lastName as string | undefined;

    const party: Record<string, string> = {};

    if (firstName && firstName.trim()) {
      party.firstName = firstName;
    }

    if (lastName && lastName.trim()) {
      party.lastName = lastName;
    }

    if (Object.keys(party).length === 0) {
      return;
    }

    const possessionClaimResponse: PossessionClaimResponse = {
      defendantContactDetails: {
        party,
      },
    };

    await buildCcdCaseForPossessionClaimResponse(req, possessionClaimResponse);
  },
  translationKeys: {
    // Browser/tab title
    pageTitle: 'pageTitle',
    // On-page H1
    heading: 'heading',
    caption: 'caption',
    contactUs: 'contactUs',
  },
  getInitialFormData: req => {
    const { defendantContactDetailsParty: party, claimantEnteredDefendantDetails: claimantEntry } = req.res?.locals
      .validatedCase ?? {
      defendantContactDetailsParty: undefined,
      claimantEnteredDefendantDetails: undefined,
    };

    const firstName =
      (typeof party?.firstName === 'string' && party.firstName.trim() ? party.firstName : undefined) ||
      (typeof claimantEntry?.firstName === 'string' && claimantEntry.firstName.trim()
        ? claimantEntry.firstName
        : undefined);
    const lastName =
      (typeof party?.lastName === 'string' && party.lastName.trim() ? party.lastName : undefined) ||
      (typeof claimantEntry?.lastName === 'string' && claimantEntry.lastName.trim()
        ? claimantEntry.lastName
        : undefined);

    if (!firstName && !lastName) {
      return {};
    }

    return {
      ...(firstName ? { firstName } : {}),
      ...(lastName ? { lastName } : {}),
    };
  },
  fields: [
    {
      name: 'firstName',
      type: 'text',
      required: true,
      maxLength: 60,
      translationKey: {
        label: 'firstNameLabel',
      },
      labelClasses: 'govuk-label--s',
      attributes: {
        autocomplete: 'given-name',
        spellcheck: false,
      },
    },
    {
      name: 'lastName',
      type: 'text',
      required: true,
      maxLength: 60,
      translationKey: {
        label: 'lastNameLabel',
      },
      labelClasses: 'govuk-label--s',
      attributes: {
        autocomplete: 'family-name',
        spellcheck: false,
      },
    },
  ],
});
