import { buildDraftDefendantResponse, saveDraftDefendantResponse } from '../../utils/buildDraftDefendantResponse';
import { createRespondToClaimFormStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createRespondToClaimFormStep({
  stepName: 'support-needs',
  stepDir: __dirname,
  customTemplate: `${__dirname}/supportNeeds.njk`,
  translationKeys: {
    pageTitle: 'pageTitle',
    heading: 'heading',
    caption: 'caption',
    paragraph1: 'paragraph1',
  },
  fields: [],
  // No data to persist on Continue; this no-op save triggers clearSectionCompletionOnEdit
  // so the uploadFiles section drops to In progress when the citizen re-walks after Done.
  beforeRedirect: async req => {
    const response = buildDraftDefendantResponse(req);
    await saveDraftDefendantResponse(req, response);
  },
});
