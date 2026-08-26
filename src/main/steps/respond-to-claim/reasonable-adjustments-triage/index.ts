import type { Request } from 'express';

import { flowConfig } from '../flow.config';

import { Logger } from '@modules/logger';
import { createFormStep } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import { startYourSupport } from '@services/cuiRa/startYourSupport';
import { isCuiYourSupportEnabled } from '@utils/isCuiYourSupportEnabled';

const logger = Logger.getLogger('reasonableAdjustmentsTriage');

export const step: StepDefinition = createFormStep({
  stepName: 'reasonable-adjustments-triage',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/reasonableAdjustmentsTriage.njk`,
  // Drives the task-list "Your support" row status: DONE once the defendant has captured
  // adjustments (defendantFlags persisted in draft), AVAILABLE otherwise.
  isAnswered: (req: Request) =>
    Boolean(req.res?.locals.validatedCase?.possessionClaimResponse?.defendantFlags?.details?.length),
  // "Continue to the questions" (reasonableAdjustmentsChoice=questions) launches the Your Support
  // microsite;
  beforeRedirect: async (req: Request) => {
    if (req.body.reasonableAdjustmentsChoice !== 'questions') {
      return; // "skip": let the normal next-step flow continue to language-used
    }
    if (!(await isCuiYourSupportEnabled(req))) {
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
  // Your Support is now an optional task launched from the task list, so return the citizen there
  // rather than walking forward into the next section. The "questions" path 303s to the microsite
  // inside beforeRedirect (postHandler short-circuits on headersSent) and never reaches this hook.
  resolveRedirectAfterPost: async (req: Request) => {
    const caseReference = req.res?.locals.validatedCase?.id;
    return caseReference ? `/case/${caseReference}/respond-to-claim/task-list` : undefined;
  },
  // When the Your Support feature flag is off, hide the "Continue to the questions" button so the
  // page doesn't advertise a microsite that won't launch (beforeRedirect also treats it as skip).
  extendGetContent: async (req: Request) => ({
    cuiYourSupportEnabled: await isCuiYourSupportEnabled(req),
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
