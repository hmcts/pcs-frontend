import type { Request, Response } from 'express';

import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createGetController, createStepNavigation } from '../../../modules/steps';
import { DASHBOARD_ROUTE } from '../../../routes/dashboard';
import { flowConfig } from '../flow.config';
import { ccdCaseService } from 'services/ccdCaseService';

const stepName = 'start-now';
const stepNavigation = createStepNavigation(flowConfig);

export const step: StepDefinition = {
  url: '/respond-to-claim/start-now',
  name: stepName,
  view: 'respond-to-claim/start-now/startNow.njk',
  stepDir: __dirname,
  getController: () => {
    return createGetController(
      'respond-to-claim/start-now/startNow.njk',
      stepName,
      (_req: Request) => {
        return {
          backUrl: DASHBOARD_ROUTE,
        };
      },
      'respondToClaim'
    );
  },
  postController: {
    post: async (req: Request, res: Response) => {
      // Get next step URL and redirect
      var redirectPath;

      // Pull data from API
      const response = await ccdCaseService.getExistingCaseData(req.session.user?.accessToken, "1768559783943728");
      const address = response.case_details.case_data.possessionClaimResponse?.party?.address
      
      if (address) {
        const formattedAddress = [
          address.AddressLine1,
          address.AddressLine2,
          address.AddressLine3,
          address.PostTown,
          address.County,
          address.PostCode,
          address.Country,
        ].map(v => (v ?? "").trim())
          .filter(Boolean)
          .join(", ") + "?";

        req.session.formattedAddress = formattedAddress;

      if (!redirectPath) {  
        // No next step defined - show not found page
        return res.status(404).render('not-found');
      }

      res.redirect(303, redirectPath);
    },
  },
};
