import type { Request, Response } from 'express';

import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createGetController, createStepNavigation } from '../../../modules/steps';
import { getDashboardUrl } from '../../../routes/dashboard';
import { safeRedirect303 } from '../../../utils/safeRedirect';
import { RESPOND_TO_CLAIM_ROUTE, flowConfig } from '../flow.config';

const stepName = 'tenancy-details';
const stepNavigation = createStepNavigation(flowConfig);

export const step: StepDefinition = {
  url: `${RESPOND_TO_CLAIM_ROUTE}/tenancy-details`,
  name: stepName,
  view: 'respond-to-claim/tenancy-details/tenancyDetails.njk',
  stepDir: __dirname,
  getController: () => {
    return createGetController(
      'respond-to-claim/tenancy-details/tenancyDetails.njk',
      stepName,
      async (req: Request) => {
        const backUrl = await stepNavigation.getBackUrl(req, stepName);
        const nextStepUrl = await stepNavigation.getNextStepUrl(req, stepName, {});
        return {
          backUrl,
          nextStepUrl,
          url: req.originalUrl,
        };
      },
      'respondToClaim'
    );
  },
  postController: {
    post: async (req: Request, res: Response) => {
      const action = req.body?.action;

      // Handle saveForLater action
      if (action === 'saveForLater') {
        return safeRedirect303(res, getDashboardUrl(req.res?.locals.validatedCase?.id), '/', ['/dashboard']);
      }

      // Handle continue action - go to next step
      const redirectPath = await stepNavigation.getNextStepUrl(req, stepName, req.body);

      if (!redirectPath) {
        return res.status(404).render('not-found');
      }

      safeRedirect303(res, redirectPath, '/', ['/case/']);
    },
  },
};
