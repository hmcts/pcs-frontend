import type { Request } from 'express';

import { flowConfig } from '../flow.config';

import type { StepDefinition } from '@interfaces/stepFormData.interface';
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
  extendGetContent: (req: Request) => {
    const { defendantContactDetailsPartyName: defendantName, claimantName } = req.res?.locals?.validatedCase ?? {
      defendantContactDetailsPartyName: '',
      claimantName: '',
    };

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
