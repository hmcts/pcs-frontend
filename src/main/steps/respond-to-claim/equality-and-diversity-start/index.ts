import { HTTPError } from '../../../HttpError';
import { buildDraftDefendantResponse, saveDraftDefendantResponse } from '../../utils/buildDraftDefendantResponse';
import { createRespondToClaimFormStep } from '../formStep';

import { Logger } from '@modules/logger';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';

const logger = Logger.getLogger('equalityAndDiversityStart');

export const step: StepDefinition = createRespondToClaimFormStep({
  stepName: 'equality-and-diversity-start',
  kind: 'interstitial',
  stepDir: __dirname,
  fields: [],
  customTemplate: `${__dirname}/equalityAndDiversityStart.njk`,
  beforeRedirect: async req => {
    const choice: 'continue' | 'skip' | undefined = req.body?.equalityStartChoice;
    if (choice !== 'continue' && choice !== 'skip') {
      logger.warn('Invalid choice for equality and diversity questions', { choice });
      throw new HTTPError('Invalid equality and diversity choice', 400);
    }

    const response = buildDraftDefendantResponse(req);
    response.defendantResponses = {
      ...response.defendantResponses,
      equalityAndDiversityQuestionsChoice: choice === 'skip' ? 'SKIP' : 'CONTINUE',
    };

    await saveDraftDefendantResponse(req, response);
  },
});
