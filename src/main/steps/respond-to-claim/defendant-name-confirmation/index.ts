import type { Request } from 'express';

import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createFormStep } from '../../../modules/steps';
import { flowConfig } from '../flow.config';

export const step: StepDefinition = createFormStep(
  {
    stepName: 'defendant-name-confirmation',
    journeyFolder: 'respondToClaim',
    stepDir: __dirname,
    basePath: '/respond-to-claim',
    flowConfig,
    translationKeys: {
      pageTitle: 'pageTitle',
      caption: 'caption',
      heading: 'heading',
      contactUs: 'contactUs',
    },
    extendGetContent: (req: Request) => {
      console.log('=== defendant-name-confirmation extendGetContent ===');
      console.log('Session exists:', !!req.session);
      console.log('Session keys:', req.session ? Object.keys(req.session) : 'no session');
      console.log('ccdCase in session:', req.session?.ccdCase);
      console.log('Full session (stringified):', JSON.stringify(req.session, null, 2));
      //TODO: get defendant name from CCD case - currently served from LaunchDarkly flag
      const defendantName = req.session.defendantName ?? '';
      //TODO: get organisation name from CCD case - placeholder for now
      const organisationName = 'Treetops';

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
  },
  `${__dirname}/defendantNameConfirmation.njk`
);
