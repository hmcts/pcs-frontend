import { buildDraftDefendantResponse, saveDraftDefendantResponse } from '../../utils/buildDraftDefendantResponse';
import { noEmojiValidator } from '../../utils/fieldValidators';
import { createRespondToClaimFormStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createRespondToClaimFormStep({
  stepName: 'defendant-name-capture',
  stepDir: __dirname,
  showCancelButton: false,
  beforeRedirect: async req => {
    const response = buildDraftDefendantResponse(req);
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
      validator: noEmojiValidator('errors.firstNameInvalidCharacters'),
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
      validator: noEmojiValidator('errors.lastNameInvalidCharacters'),
    },
  ],
});
