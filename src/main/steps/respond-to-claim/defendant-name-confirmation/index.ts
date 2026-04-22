import type { Request } from 'express';

import { buildDraftDefendantResponse } from '../../utils/buildDraftDefendantResponse';
import { flowConfig } from '../flow.config';

import { createFormStep } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import { ccdCaseService } from '@services/ccdCaseService';

export const step: StepDefinition = createFormStep({
  stepName: 'defendant-name-confirmation',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  basePath: '/respond-to-claim',
  flowConfig,
  customTemplate: `${__dirname}/defendantNameConfirmation.njk`,
  beforeRedirect: async req => {
    const response = buildDraftDefendantResponse(req);
    const nameConfirmation = req.body?.nameConfirmation as string | undefined;

    if (nameConfirmation === 'yes' || nameConfirmation === 'no') {
      response.defendantResponses.defendantNameConfirmation = nameConfirmation === 'yes' ? 'YES' : 'NO';

      if (nameConfirmation === 'no') {
        const firstName = req.body?.['nameConfirmation.firstName'] as string | undefined;
        const lastName = req.body?.['nameConfirmation.lastName'] as string | undefined;
        if (firstName?.trim()) {
          response.defendantContactDetails.party.firstName = firstName;
        }
        if (lastName?.trim()) {
          response.defendantContactDetails.party.lastName = lastName;
        }
      } else {
        delete response.defendantContactDetails.party.firstName;
        delete response.defendantContactDetails.party.lastName;
      }
    } else {
      delete response.defendantResponses.defendantNameConfirmation;
      delete response.defendantContactDetails.party.firstName;
      delete response.defendantContactDetails.party.lastName;
    }

    await ccdCaseService.saveDraftDefendantResponse(
      req.session?.user?.accessToken,
      req.res?.locals.validatedCase?.id || '',
      response
    );
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
