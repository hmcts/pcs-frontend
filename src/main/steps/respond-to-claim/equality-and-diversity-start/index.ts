import type { PossessionClaimResponse } from '../../../interfaces/ccdCase.interface';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { HTTPError } from '../../../HttpError';
import { buildCcdCaseForPossessionClaimResponse } from '../../utils/populateResponseToClaimPayloadmap';
import { flowConfig } from '../flow.config';

import { Logger } from '@modules/logger';
import { createFormStep } from '@modules/steps';

const logger = Logger.getLogger('equalityAndDiversityStart');

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
      logger.warn('Invalid choice for equality and diversity questions', { choice });
      throw new HTTPError('Invalid equality and diversity choice', 400);
    }

    const possessionClaimResponse: PossessionClaimResponse = {
      defendantResponses: {
        equalityAndDiversityQuestionsChoice: choice === 'skip' ? 'SKIP' : 'CONTINUE',
      },
    };

    await buildCcdCaseForPossessionClaimResponse(req, possessionClaimResponse);
  },
});
