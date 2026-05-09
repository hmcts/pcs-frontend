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
      const caseRef = req.res?.locals.validatedCase?.id;
      // req.body.action ∈ {'saveAndContinue', 'saveForLater'}.
      // Phase 1a: both routes redirect to /task-list. Phase 3 may branch
      // on the action when the real task list renders status.
      res.redirect(303, `/case/${caseRef}/respond-to-claim/task-list`);
    },
  },
};
