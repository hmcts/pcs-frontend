import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createFormStep } from '../../../modules/steps';
import { buildDraftDefendantResponse } from '../../utils/buildDraftDefendantResponse';
import { flowConfig } from '../flow.config';

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
    // Reads from session for now - session removal is a separate ticket
    const textForm = req.session.formData?.['contact-preferences-text-message'];
    if (textForm) {
      response.defendantResponses.contactByText = textForm.contactByTextMessage === 'yes' ? 'YES' : 'NO';
    } else {
      delete response.defendantResponses.contactByText;
    }

    await ccdCaseService.saveDraftDefendantResponse(
      req.session?.user?.accessToken,
      req.res?.locals.validatedCase?.id,
      response
    );
  },
});
