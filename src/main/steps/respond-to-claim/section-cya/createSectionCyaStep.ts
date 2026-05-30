import type { Request, Response } from 'express';
import type { TFunction } from 'i18next';

import { RESPOND_TO_CLAIM_ROUTE, flowConfig } from '../flow.config';

import type { SummaryListRow } from './cyaRow';

import { createGetController, createStepNavigation, getTranslationFunction } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import { getDashboardUrl } from '@routes/dashboard';
import { getFlowConfigForJourney } from '@steps';

const journeyName = 'respondToClaim';

// Every section-CYA page renders through this one template.
const VIEW = 'respond-to-claim/section-cya/sectionCya.njk';

export interface SectionCyaStepConfig {
  /** Journey step slug, e.g. 'check-your-answers-your-response'. */
  stepName: string;
  /** Translation key for the summary-card title (and the page <title>). */
  cardTitleKey: string;
  /** The owning folder's __dirname. */
  stepDir: string;
  /** Section-specific row builder. */
  buildRows: (req: Request, t: TFunction) => SummaryListRow[];
  /** Render rows with GOV.UK classes on presentation divs, avoiding dl/dt/dd announcements. */
  renderRowsAsPresentation?: boolean;
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
  renderRowsAsPresentation = false,
}: SectionCyaStepConfig): StepDefinition {
  const resolveFlow = (req: Request) => getFlowConfigForJourney(journeyName, req) || flowConfig;
  const stepNavigation = createStepNavigation(resolveFlow);

  return {
    url: `${RESPOND_TO_CLAIM_ROUTE}/${stepName}`,
    name: stepName,
    view: VIEW,
    stepDir,
    getController: () =>
      createGetController(VIEW, stepName, stepNavigation, async (req: Request) => {
        const caseRef = req.res?.locals.validatedCase?.id;
        const t: TFunction = getTranslationFunction(req);
        const cardTitle = t(cardTitleKey);
        const rows = buildRows(req, t);

        return {
          summaryData: {
            cardTitle,
            renderRowsAsPresentation,
            rows,
          },
          formAction: `/case/${caseRef}/respond-to-claim/${stepName}`,
          backUrl: await stepNavigation.getBackUrl(req, stepName),
        };
      }),
    postController: {
      post: async (req: Request, res: Response) => {
        const action = req.body?.action;
        const isSaveForLater = action === 'saveForLater';
        const caseId = req.res?.locals.validatedCase?.id;

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
