import type { Request, Response } from 'express';
import type { TFunction } from 'i18next';

import { RESPOND_TO_CLAIM_ROUTE, flowConfig } from '../flow.config';

import { buildSectionCyaRows } from './buildSectionCyaRows';

import { createGetController, createStepNavigation, getTranslationFunction } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import { getFlowConfigForJourney } from '@steps';

const journeyName = 'respondToClaim';
const stepName = 'section-cya-start-now-and-details';
const view = `respond-to-claim/${stepName}/sectionCyaStartNowAndDetails.njk`;
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
            card: { title: { text: t('taskList.startNowAndDetails') } },
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
      // req.body.action ∈ {'saveAndContinue', 'saveForLater'}.
      // Until the real task list is wired (Phase 3), both buttons just
      // continue the journey via the engine's natural section walk —
      // i.e. the first visible step of the next applicable section.
      // Phase 3 will branch on req.body.action and redirect to /task-list.
      const redirectPath = await stepNavigation.getNextStepUrl(req, stepName);
      if (!redirectPath) {
        return res.status(404).render('not-found');
      }
      res.redirect(303, redirectPath);
    },
  },
};
