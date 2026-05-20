import type { NextFunction, Request, Response } from 'express';
import type { TFunction } from 'i18next';

import { buildDraftDefendantResponse, saveDraftDefendantResponse } from '../../utils/buildDraftDefendantResponse';
import { RESPOND_TO_CLAIM_ROUTE, flowConfig } from '../flow.config';
import { findSectionIdForStep, sectionIdToBackendEnum } from '../sections.config';

import type { SummaryListRow } from './cyaRow';

import { createGetController, createStepNavigation, getTranslationFunction } from '@modules/steps';
import { getStepUrl } from '@modules/steps/flow';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import { getDashboardUrl } from '@routes/dashboard';
import { getFlowConfigForJourney } from '@steps';

const journeyName = 'respondToClaim';

// One shared template for every section-CYA page — the card title and rows come
// from the step's config, the page <title> reads summaryData.card.title.text.
const VIEW = 'respond-to-claim/section-cya/sectionCya.njk';

export interface SectionCyaStepConfig {
  /** Journey step slug, e.g. 'check-your-answers-your-response'. */
  stepName: string;
  /** Translation key for the summary-card title (and the page <title>). */
  cardTitleKey: string;
  /** The owning folder's __dirname — kept for parity with the StepDefinition shape. */
  stepDir: string;
  /** Section-specific row builder. */
  buildRows: (req: Request, t: TFunction) => SummaryListRow[];
}

/**
 * Builds the StepDefinition for a respond-to-claim section-CYA page. Every section
 * CYA shares the same controller wiring, navigation and template — only the card
 * title and the row builder differ, so those are the only inputs.
 */
export function createSectionCyaStep({
  stepName,
  cardTitleKey,
  stepDir,
  buildRows,
}: SectionCyaStepConfig): StepDefinition {
  const resolveFlow = (req: Request) => getFlowConfigForJourney(journeyName, req) || flowConfig;
  const stepNavigation = createStepNavigation(resolveFlow);

  return {
    url: `${RESPOND_TO_CLAIM_ROUTE}/${stepName}`,
    name: stepName,
    view: VIEW,
    stepDir,
    getController: () =>
      createGetController(
        VIEW,
        stepName,
        stepNavigation,
        async (req: Request) => {
          const caseRef = req.res?.locals.validatedCase?.id;
          const t: TFunction = getTranslationFunction(req, stepName, ['common']);

          return {
            summaryData: {
              card: { title: { text: t(cardTitleKey) } },
              rows: buildRows(req, t),
            },
            formAction: `/case/${caseRef}/respond-to-claim/${stepName}`,
            backUrl: await stepNavigation.getBackUrl(req, stepName),
          };
        },
        journeyName
      ),
    postController: {
      post: async (req: Request, res: Response, next: NextFunction) => {
        const action = req.body?.action;
        const isSaveForLater = action === 'saveForLater';
        const caseId = req.res?.locals.validatedCase?.id;
        const sectionId = findSectionIdForStep(stepName);

        if (sectionId) {
          try {
            const draft = buildDraftDefendantResponse(req);
            const enumValue = sectionIdToBackendEnum(sectionId);
            const current = draft.defendantResponses.completedSections ?? [];
            draft.defendantResponses.completedSections = isSaveForLater
              ? current.filter(s => s !== enumValue)
              : current.includes(enumValue)
                ? current
                : [...current, enumValue];
            await saveDraftDefendantResponse(req, draft);
          } catch (error) {
            return next(error);
          }
        }

        // Hub-first: both S&C and SFL land on the task-list for the citizen variant.
        // Status differs (Done vs In progress) via the completedSections write above.
        const activeFlow = resolveFlow(req);
        const hub = activeFlow.hubStepName;
        if (hub) {
          return res.redirect(303, getStepUrl(hub, activeFlow, caseId));
        }

        // Legalrep / no-hub fallback — preserves existing behaviour for variants without a task-list.
        if (isSaveForLater) {
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
}
