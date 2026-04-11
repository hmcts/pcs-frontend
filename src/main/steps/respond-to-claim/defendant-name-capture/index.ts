import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { getDraftDefendantResponse, saveDraftDefendantResponse } from '../../utils/populateResponseToClaimPayloadmap';
import { flowConfig } from '../flow.config';

import { createFormStep } from '@modules/steps';

export const step: StepDefinition = createFormStep({
  stepName: 'defendant-name-capture',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  showCancelButton: false,
  beforeRedirect: async req => {
    const response = getDraftDefendantResponse(req);
    response.defendantContactDetails = response.defendantContactDetails ?? {};
    response.defendantContactDetails.party = response.defendantContactDetails.party ?? {};

    const firstName = req.body?.firstName as string | undefined;
    const lastName = req.body?.lastName as string | undefined;

    if (firstName?.trim()) {
      response.defendantContactDetails.party.firstName = firstName;
    } else {
      delete response.defendantContactDetails.party.firstName;
    }
    if (lastName?.trim()) {
      response.defendantContactDetails.party.lastName = lastName;
    } else {
      delete response.defendantContactDetails.party.lastName;
    }

    await saveDraftDefendantResponse(req, response);
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
    const caseData = req.res?.locals.validatedCase?.data;
    const party = caseData?.possessionClaimResponse?.defendantContactDetails?.party;
    const claimantEntry = caseData?.possessionClaimResponse?.claimantEnteredDefendantDetails;

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
