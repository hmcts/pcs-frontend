import type { Request } from 'express';

import { flowConfig } from '../flow.config';

import { Logger } from '@modules/logger';
import { createFormStep } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import { startYourSupport } from '@services/cuiRa/startYourSupport';

const logger = Logger.getLogger('reasonableAdjustmentsTriage');

export const step: StepDefinition = createFormStep({
  stepName: 'reasonable-adjustments-triage',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/reasonableAdjustmentsTriage.njk`,
  // "Continue to the questions" (reasonableAdjustmentsChoice=questions) launches the Your Support
  // microsite. The "I do not need any support at this time" (reasonableAdjustmentsChoice=skip)
  // button instead continues the response journey at the language-used page.
  beforeRedirect: async (req: Request) => {
    const caseReference = req.res?.locals.validatedCase?.id;
    if (req.body.reasonableAdjustmentsChoice === 'questions') {
      try {
        const redirectUrl = await startYourSupport(req);
        req.res?.redirect(303, redirectUrl); // postHandler short-circuits on res.headersSent
      } catch (error) {
        // Any failure launching Your Support (cui-ra down, POST error, missing token) lands the
        // citizen on the context-aware RA error page, which offers a route back to triage. We
        // deliberately do NOT rethrow, so we avoid the shared error page (no way back into this
        // journey) and the authFailure login-redirect that a cui-ra 401 would otherwise trigger.
        logger.error(`Failed to launch Your Support for case ${caseReference}`, error);
        if (caseReference) {
          req.res?.redirect(303, `/case/${caseReference}/respond-to-claim/reasonable-adjustments-error`);
        }
      }
      return;
    }
    // TODO (HDPI-7379, INTERIM until the PCQ integration wires the RA journey): we redirect
    // EXPLICITLY only because reasonable-adjustments-triage is a NON-section step (flow.config
    // `nonSectionStepOrder`): getNextStep from a non-section step never traverses into the
    // checkYourAnswersAndSubmit section, where language-used lives. If triage is later moved back
    // into that section (immediately before language-used), delete this redirect — the normal
    // next-step flow will route there automatically. Track in Jira.
    if (caseReference) {
      req.res?.redirect(303, `/case/${caseReference}/respond-to-claim/language-used`);
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
