import type { Request, Response } from 'express';
import type { TFunction } from 'i18next';

import { RESPOND_TO_CLAIM_ROUTE, flowConfig } from '../flow.config';

import { buildSectionCyaRows } from './buildSectionCyaRows';

import { createGetController, createStepNavigation, getTranslationFunction } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import { getDashboardUrl } from '@routes/dashboard';
import { getFlowConfigForJourney } from '@steps';

const journeyName = 'respondToClaim';
const stepName = 'section-cya-personal-details';
const view = `respond-to-claim/${stepName}/sectionCyaPersonalDetails.njk`;
const stepNavigation = createStepNavigation(req => getFlowConfigForJourney(journeyName, req) || flowConfig);

export const step: StepDefinition = {
  url: `${RESPOND_TO_CLAIM_ROUTE}/${stepName}`,
  name: stepName,
  view,
  stepDir: __dirname,
  getController: () =>
    createGetController(
      view,
      stepName,
      stepNavigation,
      async (req: Request) => {
        const caseRef = req.res?.locals.validatedCase?.id;
        const t: TFunction = getTranslationFunction(req, stepName, ['common']);

        return {
          summaryData: {
            card: { title: { text: t('cardTitle') } },
            rows: buildSectionCyaRows(req, t),
          },
          formAction: `/case/${caseRef}/respond-to-claim/${stepName}`,
          backUrl: await stepNavigation.getBackUrl(req, stepName),
        };
      },
      journeyName
    ),
  postController: {
    post: async (req: Request, res: Response) => {
      const action = req.body?.action;

      if (action === 'saveForLater') {
        const caseId = req.res?.locals.validatedCase?.id;
        const dashboardUrl = getDashboardUrl(caseId);
        return res.redirect(303, dashboardUrl ?? '/');
      }

      const redirectPath = await stepNavigation.getNextStepUrl(req, stepName);
      if (!redirectPath) {
        return res.status(404).render('not-found');
      }
      res.redirect(303, redirectPath);
    },
  },
};
