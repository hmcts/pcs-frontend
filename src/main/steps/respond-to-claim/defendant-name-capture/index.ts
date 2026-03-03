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
    // Read from CCD (fresh data via res.locals.validatedCase)
    const caseData = req.res?.locals.validatedCase?.data;
    const party = caseData?.possessionClaimResponse?.defendantContactDetails?.party;
    const existingFirstName = party?.firstName;
    const existingLastName = party?.lastName;

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
