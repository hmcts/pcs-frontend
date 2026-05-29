import config from 'config';
import type { Request, Response } from 'express';

import { isLegalRepresentativeUser } from '../../utils/userRole';
import { RESPOND_TO_CLAIM_ROUTE, flowConfig } from '../flow.config';

import { createGetController, createStepNavigation } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import { getDashboardUrl } from '@routes/dashboard';
import { getFlowConfigForJourney } from '@steps';
import { clientContextSessionClearer } from '@utils/clientContextSessionClearer';

const journeyName = 'respondToClaim';
const stepName = 'start-now';
const stepNavigation = createStepNavigation(req => getFlowConfigForJourney(journeyName, req) || flowConfig);

export const step: StepDefinition = {
  url: `${RESPOND_TO_CLAIM_ROUTE}/start-now`,
  name: stepName,
  view: 'respond-to-claim/start-now/startNow.njk',
  stepDir: __dirname,
  getController: () => {
    return createGetController('respond-to-claim/start-now/startNow.njk', stepName, stepNavigation, (req: Request) => {
      const caseId = req.res?.locals.validatedCase?.id;
      const dashboardUrl = getDashboardUrl(caseId);
      let backUrl = dashboardUrl;
      if (isLegalRepresentativeUser(req) && caseId && config.has('redirects.manageCaseReturnURL')) {
        backUrl = `${config.get<string>('redirects.manageCaseReturnURL')}/${caseId}`;
      }
      return {
        backUrl,
        dashboardUrl,
      };
    });
  },
  postController: {
    post: async (req: Request, res: Response) => {
      clientContextSessionClearer(req);
      // Get next step URL and redirect
      const redirectPath = await stepNavigation.getNextStepUrl(req, stepName);

      if (!redirectPath) {
        // No next step defined - show not found page
        return res.status(404).render('not-found');
      }

      res.redirect(303, redirectPath);
    },
  },
};
