import { buildDraftDefendantResponse } from '../../utils/buildDraftDefendantResponse';
import { flowConfig } from '../flow.config';

import { createFormStep } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import { ccdCaseService } from '@services/ccdCaseService';

export const step: StepDefinition = createFormStep({
  stepName: 'contact-preferences-text-message',
  journeyFolder: 'respondToClaim',
  showCancelButton: false,
  stepDir: __dirname,
  flowConfig,

  translationKeys: {
    caption: 'caption',
    heading: 'heading',
    pageTitle: 'pageTitle',
    content: 'subtitle',
  },

  fields: [
    {
      name: 'contactByTextMessage',
      type: 'radio',
      required: true,
      legendClasses: 'govuk-!-font-weight-bold govuk-!-font-size-24',
      translationKey: {
        label: 'question',
      },
      options: [
        {
          value: 'yes',
          translationKey: 'options.yes',
        },
        {
          value: 'no',
          translationKey: 'options.no',
        },
      ],
    },
  ],
  beforeRedirect: async req => {
    const response = buildDraftDefendantResponse(req);
    const contactByTextMessage = req.body?.contactByTextMessage as 'yes' | 'no' | undefined;

    if (contactByTextMessage === 'yes') {
      response.defendantResponses.contactByText = 'YES';
    } else if (contactByTextMessage === 'no') {
      response.defendantResponses.contactByText = 'NO';
    } else {
      delete response.defendantResponses.contactByText;
    }

    await ccdCaseService.saveDraftDefendantResponse(
      req.session?.user?.accessToken,
      req.res?.locals.validatedCase?.id || '',
      response
    );
  },
});
