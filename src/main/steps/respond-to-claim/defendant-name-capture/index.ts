import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { flowConfig } from '../flow.config';

import { createFormStep } from '@modules/steps';

export const step: StepDefinition = createFormStep({
  stepName: 'defendant-name-capture',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  showCancelButton: false,
  translationKeys: {
    // Browser/tab title
    pageTitle: 'pageTitle',
    // On-page H1
    heading: 'heading',
    caption: 'caption',
    contactUs: 'contactUs',
  },
  extendGetContent: async (req, formContent) => {
    // Read from claimantEnteredDefendantDetails (what claimant entered)
    // UNIFORM: Same data source as defendant-name-confirmation
    const caseData = req.res?.locals.validatedCase?.data;
    const claimantEntry = caseData?.possessionClaimResponse?.claimantEnteredDefendantDetails;
    const existingFirstName = claimantEntry?.firstName;
    const existingLastName = claimantEntry?.lastName;

    // Only prepopulate on GET (not POST with validation errors)
    if (!req.body?.firstName && (existingFirstName || existingLastName)) {
      formContent.fields = formContent.fields.map(field => {
        if (field.name === 'firstName' && existingFirstName) {
          return { ...field, value: existingFirstName };
        }
        if (field.name === 'lastName' && existingLastName) {
          return { ...field, value: existingLastName };
        }
        return field;
      });
    }

    return formContent;
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
