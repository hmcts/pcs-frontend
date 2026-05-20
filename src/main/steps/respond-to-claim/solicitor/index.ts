import { buildDraftDefendantResponse, saveDraftDefendantResponse } from '../../utils/buildDraftDefendantResponse';
import { createRespondToClaimFormStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import type { YesNoValue } from '@services/ccdCase.interface';

export const step: StepDefinition = createRespondToClaimFormStep({
  stepName: 'solicitor',
  stepDir: __dirname,
  customTemplate: `${__dirname}/solicitor.njk`,
  translationKeys: {
    pageTitle: 'pageTitle',
    heading: 'heading',
    caption: 'caption',
  },
  fields: [
    {
      name: 'hasSolicitor',
      type: 'radio',
      required: true,
      legendClasses: 'govuk-fieldset__legend--l',
      translationKey: {
        label: 'question',
      },
      options: [
        { value: 'YES', translationKey: 'options.yes' },
        { value: 'NO', translationKey: 'options.no' },
      ],
    },
  ],
  getInitialFormData: req => {
    const hasSolicitor =
      req.res?.locals?.validatedCase?.data?.possessionClaimResponse?.defendantResponses?.hasSolicitor;
    return { hasSolicitor };
  },
  beforeRedirect: async req => {
    const response = buildDraftDefendantResponse(req);
    const hasSolicitor: YesNoValue | undefined = req.body?.hasSolicitor;

    if (hasSolicitor) {
      response.defendantResponses.hasSolicitor = hasSolicitor;
    } else {
      delete response.defendantResponses.hasSolicitor;
    }

    await saveDraftDefendantResponse(req, response);
  },
});
