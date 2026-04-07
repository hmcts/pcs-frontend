import type { PossessionClaimResponse } from '../../../interfaces/ccdCase.interface';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { buildCcdCaseForPossessionClaimResponse } from '../../utils/populateResponseToClaimPayloadmap';
import { flowConfig } from '../flow.config';

import { createFormStep } from '@modules/steps';

export const step: StepDefinition = createFormStep({
  stepName: 'equality-and-diversity-start',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  fields: [],
  customTemplate: `${__dirname}/equalityAndDiversityStart.njk`,
  beforeRedirect: async req => {
    const choice: 'continue' | 'skip' | undefined = req.body?.equalityStartChoice;
    if (choice !== 'continue' && choice !== 'skip') {
      return;
    }

    const possessionClaimResponse: PossessionClaimResponse = {
      defendantResponses: {
        equalityAndDiversityQuestionsChoice: choice === 'skip' ? 'SKIP' : 'CONTINUE',
      },
    };

    await buildCcdCaseForPossessionClaimResponse(req, possessionClaimResponse);
  },
});
