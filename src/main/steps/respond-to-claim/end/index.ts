import type { Request } from 'express';

import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createGetController } from '../../../modules/steps';
import { getDashboardUrl } from '../../../routes/dashboard';
import { RESPOND_TO_CLAIM_ROUTE } from '../flow.config';

const stepName = 'end';

export const step: StepDefinition = {
  url: `${RESPOND_TO_CLAIM_ROUTE}/${stepName}`,
  name: stepName,
  view: 'respond-to-claim/end/end.njk',
  stepDir: __dirname,
  getController: () => {
    return createGetController(
      'respond-to-claim/end/end.njk',
      stepName,
      (req: Request) => {
        const caseReference = req.params.caseReference;
        return {
          dashboardUrl: getDashboardUrl(caseReference),
        };
      },
      'respondToClaim'
    );
  },
};
