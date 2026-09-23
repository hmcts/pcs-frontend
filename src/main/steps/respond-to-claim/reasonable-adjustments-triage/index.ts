import type { Request } from 'express';

import { buildDraftDefendantResponse, saveDraftDefendantResponse } from '../../utils/buildDraftDefendantResponse';
import { flowConfig } from '../flow.config';
import {
  addYourSupportToCompletedSections,
  getYourSupportReturnUrl,
  isYourSupportSectionComplete,
  rememberYourSupportOrigin,
} from '../yourSupportSection';

import { Logger } from '@modules/logger';
import { createFormStep } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import { isDefendantResponseSubmitted } from '@services/ccdCaseData.model';
import { startYourSupport } from '@services/cuiRa/startYourSupport';
import { isCuiYourSupportEnabled } from '@utils/isCuiYourSupportEnabled';

const logger = Logger.getLogger('reasonableAdjustmentsTriage');

// "I do not need any support at this time" is an explicit answer. Record it on the draft
async function recordNoSupportNeeded(req: Request): Promise<void> {
  if (isDefendantResponseSubmitted(req.res?.locals.validatedCase?.data)) {
    return;
  }

  const draft = buildDraftDefendantResponse(req);
  draft.defendantResponses.completedSections = addYourSupportToCompletedSections(
    draft.defendantResponses.completedSections
  );
  await saveDraftDefendantResponse(req, draft);
}

export const step: StepDefinition = createFormStep({
  stepName: 'reasonable-adjustments-triage',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/reasonableAdjustmentsTriage.njk`,
  // Remember whether the citizen came from the dashboard (?from=dashboard) or the task list; the back
  // link, the skip redirect and the confirmation/cancelled pages all return there.
  beforeGet: async (req: Request) => {
    rememberYourSupportOrigin(req);
  },
  // Drives the task-list "Your support" row status: DONE once the defendant has captured adjustments
  // (defendantFlags persisted in draft) or explicitly said none are needed (recordNoSupportNeeded, or a
  // trip through the microsite that changed nothing); AVAILABLE otherwise. A cancel in the microsite
  // writes nothing, so it leaves the status as it was.
  isAnswered: (req: Request) => {
    const response = req.res?.locals.validatedCase?.possessionClaimResponse;
    return Boolean(response?.defendantFlags?.details?.length) || isYourSupportSectionComplete(response);
  },
  // "Continue to the questions" (reasonableAdjustmentsChoice=questions) launches the Your Support
  // microsite;
  beforeRedirect: async (req: Request) => {
    if (req.body?.reasonableAdjustmentsChoice !== 'questions') {
      await recordNoSupportNeeded(req);
      return;
    }

    if (!(await isCuiYourSupportEnabled(req))) {
      // Flag off: the button is hidden, so this is a stale tab or a crafted POST
      return;
    }
    const caseReference = req.res?.locals.validatedCase?.id;
    try {
      const redirectUrl = await startYourSupport(req);
      req.res?.redirect(303, redirectUrl); // postHandler short-circuits on res.headersSent
    } catch (error) {
      // Any failure launching Your Support (cui-ra down, POST error, missing token) must land the
      // citizen on the context-aware RA error page
      logger.error(`Failed to launch Your Support for case ${caseReference}`, error);
      if (!caseReference) {
        throw error;
      }
      req.res?.redirect(303, `/case/${caseReference}/respond-to-claim/reasonable-adjustments-error`);
    }
  },
  // The "I do not need any support at this time" button (and the flag-off fall-through) lands here.
  // Your Support is an optional task, so return the citizen to wherever they launched it from (task
  // list or dashboard) rather than walking forward into the next section. The "questions" path 303s to
  // the microsite inside beforeRedirect (postHandler short-circuits on headersSent) and never gets here.
  resolveRedirectAfterPost: async (req: Request) => getYourSupportReturnUrl(req),
  // When the Your Support feature flag is off, hide the "Continue to the questions" button so the
  // page doesn't advertise a microsite that won't launch (see the flag-off branch in beforeRedirect).
  // backUrl points back to wherever the citizen launched Your Support from.
  extendGetContent: async (req: Request) => ({
    cuiYourSupportEnabled: await isCuiYourSupportEnabled(req),
    backUrl: getYourSupportReturnUrl(req),
  }),
  translationKeys: {
    pageTitle: 'pageTitle',
    heading: 'heading',
    askingForReasonableAdjustmentHeading: 'askingForReasonableAdjustmentHeading',
    askingForReasonableAdjustmentParagraph1: 'askingForReasonableAdjustmentParagraph1',
    askingForReasonableAdjustmentParagraph2: 'askingForReasonableAdjustmentParagraph2',
    askingForReasonableAdjustmentParagraph3: 'askingForReasonableAdjustmentParagraph3',
    askingForReasonableAdjustmentParagraph4: 'askingForReasonableAdjustmentParagraph4',
    askingForSomethingElseHeading: 'askingForSomethingElseHeading',
    askingForSomethingElseParagraph1: 'askingForSomethingElseParagraph1',
    askingForSomethingElseParagraph2: 'askingForSomethingElseParagraph2',
    askingForSomethingElseParagraph3: 'askingForSomethingElseParagraph3',
    contactByEmailHeading: 'contactByEmailHeading',
    contactByEmailParagraph1Prefix: 'contactByEmailParagraph1Prefix',
    contactByEmailParagraph1LinkText: 'contactByEmailParagraph1LinkText',
    contactByEmailParagraph1Suffix: 'contactByEmailParagraph1Suffix',
    contactByEmailParagraph2: 'contactByEmailParagraph2',
    contactByPhoneHeading: 'contactByPhoneHeading',
    contactByPhoneParagraph1: 'contactByPhoneParagraph1',
    contactByPhoneParagraph2: 'contactByPhoneParagraph2',
    contactByPhoneParagraph3: 'contactByPhoneParagraph3',
    askingForReasonableAdjustmentListItem1: 'askingForReasonableAdjustmentListItem1',
    askingForReasonableAdjustmentListItem2: 'askingForReasonableAdjustmentListItem2',
    askingForReasonableAdjustmentListItem3: 'askingForReasonableAdjustmentListItem3',
    askingForReasonableAdjustmentListItem4: 'askingForReasonableAdjustmentListItem4',
    askingForSomethingElseListItem1: 'askingForSomethingElseListItem1',
    askingForSomethingElseListItem2: 'askingForSomethingElseListItem2',
    askingForSomethingElseListItem3: 'askingForSomethingElseListItem3',
    raQuestionsButton: 'raQuestionsButton',
    progressButton: 'progressButton',
  },
  fields: [],
});
