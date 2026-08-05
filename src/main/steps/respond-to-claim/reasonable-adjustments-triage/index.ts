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
  // "Continue to the questions" (reasonableAdjustmentsChoice=questions) launches the Your Support
  // microsite;
  beforeRedirect: async (req: Request) => {
    if (req.body.reasonableAdjustmentsChoice !== 'questions') {
      return; // "skip": let the normal next-step flow continue to language-used
    }
    // Gate the Your Support launch on the feature flag (pattern A helper). When off, fall through to
    // the normal next-step flow (as if the citizen had skipped) rather than invoking the microsite.
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
