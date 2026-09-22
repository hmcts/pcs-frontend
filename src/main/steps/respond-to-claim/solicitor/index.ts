import { buildDraftDefendantResponse, saveDraftDefendantResponse } from '../../utils/buildDraftDefendantResponse';
import { createRespondToClaimFormStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import type { YesNoValue } from '@services/ccdCase.interface';

export const step: StepDefinition = createRespondToClaimFormStep({
  stepName: 'solicitor',
  isAnswered: req => Boolean(req.res?.locals?.validatedCase?.defendantResponses?.hasSolicitor),
  stepDir: __dirname,
  customTemplate: `${__dirname}/solicitor.njk`,
  translationKeys: {
    pageTitle: 'pageTitle',
  },
  fields: [
    {
      name: 'hasSolicitor',
      type: 'radio',
      required: true,
      legendClasses: 'govuk-fieldset__legend govuk-visually-hidden',
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

    // Ensure the local validatedCase reflects the saved value so the showCondition
    // on ask-your-solicitor-to-respond-to-the-claim resolves correctly during
    // this request's flow navigation, regardless of what CCD echoes back.
    const defendantResponses = req.res?.locals?.validatedCase?.data?.possessionClaimResponse?.defendantResponses;
    if (defendantResponses !== undefined) {
      if (hasSolicitor) {
        defendantResponses.hasSolicitor = hasSolicitor;
      } else {
        delete defendantResponses.hasSolicitor;
      }
    }
  },
});
