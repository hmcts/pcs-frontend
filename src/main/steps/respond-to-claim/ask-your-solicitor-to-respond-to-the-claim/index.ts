import { RESPOND_TO_CLAIM_ROUTE } from '../flow.config';
import { createRespondToClaimFormStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createRespondToClaimFormStep({
  stepName: 'ask-your-solicitor-to-respond-to-the-claim',
  stepDir: __dirname,
  customTemplate: `${__dirname}/askYourSolicitorToRespondToTheClaim.njk`,
  translationKeys: {
    pageTitle: 'pageTitle',
    heading: 'heading',
    paragraph1: 'paragraph1',
    closeAndReturnToTaskList: 'closeAndReturnToTaskList',
  },
  fields: [],
  extendGetContent: req => {
    const caseReference = req.res?.locals.validatedCase?.id;
    const taskListUrl = caseReference
      ? `${RESPOND_TO_CLAIM_ROUTE.replace(':caseReference', String(caseReference))}/start-now`
      : null;
    return { taskListUrl };
  },
});
