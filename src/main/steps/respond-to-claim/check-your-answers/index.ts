import type { Request, Response } from 'express';

import { getStepsInSection, isSectionApplicable } from '../../utils';
import { buildCcdCaseForPossessionClaimResponse } from '../../utils/populateResponseToClaimPayloadmap';
import { flowConfig } from '../flow.config';
import { stepRegistry } from '../stepRegistry';
import { buildSectionStatusPatch } from '../utils/sectionStatusPatch';

import { type SummaryListItem, extractRowsFromFields } from './summaryRows';

import { createGetController, createStepNavigation, getTranslationFunction, loadStepNamespace } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import { getDashboardUrl } from '@routes/dashboard';
import { safeRedirect303 } from '@utils/safeRedirect';

const STEP_NAME = 'check-your-answers';
const stepNavigation = createStepNavigation(flowConfig);
const JOURNEY_BASE = '/case/:caseReference/respond-to-claim';

function getSectionId(req: Request): string | null {
  return typeof req.query.section === 'string' ? req.query.section : null;
}

function getSectionCyaAction(req: Request): 'saveAndContinue' | 'saveForLater' | null {
  const action = req.body?.action;
  if (action === 'saveAndContinue' || action === 'saveForLater') {
    return action;
  }
  return null;
}

async function saveSectionStatus(req: Request, sectionId: string, action: 'saveAndContinue' | 'saveForLater') {
  const status = action === 'saveAndContinue' ? 'COMPLETED' : 'IN_PROGRESS';
  await buildCcdCaseForPossessionClaimResponse(req, buildSectionStatusPatch(sectionId, status));
}

function getBaseJourneyPath(req: Request): string {
  const caseReference = req.res?.locals.validatedCase?.id;
  return JOURNEY_BASE.replace(':caseReference', String(caseReference ?? ''));
}

function getStepUrlForSummary(req: Request, stepSlug: string): string {
  const lang = typeof req.query.lang === 'string' ? req.query.lang : undefined;
  const basePath = getBaseJourneyPath(req);
  const langQuery = lang ? `?lang=${encodeURIComponent(lang)}` : '';
  return `${basePath}/${stepSlug}${langQuery}`;
}

async function getStepContent(req: Request, stepSlug: string): Promise<Record<string, unknown> | null> {
  if (stepSlug === STEP_NAME || !(stepSlug in stepRegistry)) {
    return null;
  }
  const stepDefinition: StepDefinition = stepRegistry[stepSlug as keyof typeof stepRegistry];

  const controller =
    typeof stepDefinition.getController === 'function' ? stepDefinition.getController() : stepDefinition.getController;

  if (!controller || typeof controller.get !== 'function') {
    return null;
  }

  const originalUrl = req.originalUrl;
  const stepUrl = getStepUrlForSummary(req, stepSlug);
  let renderedContent: Record<string, unknown> | null = null;

  const fakeRes = {
    locals: req.res?.locals ?? {},
    render: (_view: string, content: Record<string, unknown>) => {
      renderedContent = content;
    },
    redirect: () => undefined,
    status: () => fakeRes,
    send: () => undefined,
  } as unknown as Response;

  try {
    req.originalUrl = stepUrl;
    await controller.get(req, fakeRes);
    return renderedContent;
  } finally {
    req.originalUrl = originalUrl;
  }
}

async function buildSectionSummaryRows(req: Request, sectionId: string): Promise<SummaryListItem[]> {
  const sectionSteps = getStepsInSection(sectionId, flowConfig.sections ?? {});
  const summaryRows: SummaryListItem[] = [];
  const commonT = getTranslationFunction(req, STEP_NAME, ['common']);
  const basePath = getBaseJourneyPath(req);

  for (const stepSlug of sectionSteps) {
    if (stepSlug === STEP_NAME) {
      continue;
    }

    await loadStepNamespace(req, stepSlug, 'respondToClaim');
    const stepContent = await getStepContent(req, stepSlug);
    if (!stepContent) {
      continue;
    }

    summaryRows.push(...extractRowsFromFields(stepContent.fields, stepSlug, sectionId, basePath, commonT));
  }

  return summaryRows;
}

export const step: StepDefinition = {
  url: `${JOURNEY_BASE}/${STEP_NAME}`,
  name: STEP_NAME,
  view: `${__dirname}/checkYourAnswers.njk`,
  stepDir: __dirname,
  getController: () =>
    createGetController(
      `${__dirname}/checkYourAnswers.njk`,
      STEP_NAME,
      stepNavigation,
      async req => {
        await loadStepNamespace(req, STEP_NAME, 'respondToClaim');
        const t = getTranslationFunction(req, STEP_NAME, ['common']);
        const sectionId = getSectionId(req);
        const caseId = req.res?.locals.validatedCase?.id;

        if (sectionId && flowConfig.sections?.[sectionId]) {
          const isApplicable = await isSectionApplicable(sectionId, flowConfig.sections, req);
          const summaryRows = isApplicable ? await buildSectionSummaryRows(req, sectionId) : [];
          return {
            isSectionCya: true,
            heading: t('sectionHeading', 'Check your answers'),
            summaryRows,
            caseReference: caseId,
            dashboardUrl: getDashboardUrl(caseId),
          };
        }

        return {
          isSectionCya: false,
          heading: t('finalHeading', 'Check your answers'),
        };
      },
      'respondToClaim'
    ),
  postController: {
    post: async (req: Request, res: Response) => {
      const sectionId = getSectionId(req);
      if (sectionId && flowConfig.sections?.[sectionId]) {
        const action = getSectionCyaAction(req);
        if (req.body?.action !== undefined && action === null) {
          return res.status(400).send('Invalid action for section check your answers');
        }

        if (action) {
          await saveSectionStatus(req, sectionId, action);
        }

        const caseId = req.res?.locals.validatedCase?.id;
        const dashboardUrl = getDashboardUrl(caseId);

        if (!dashboardUrl) {
          return safeRedirect303(res, '/', '/', ['/']);
        }

        return safeRedirect303(res, dashboardUrl, '/', ['/dashboard']);
      }

      const redirectPath = await stepNavigation.getNextStepUrl(req, STEP_NAME, req.body);
      if (!redirectPath) {
        return res.status(500).send('Unable to determine next step');
      }
      return safeRedirect303(res, redirectPath, '/', ['/']);
    },
  },
};
