import type { Request } from 'express';

import { flowConfig } from '../flow.config';

import { createFormStep } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import { startYourSupport } from '@services/cuiRa/startYourSupport';

export const step: StepDefinition = createFormStep({
  stepName: 'reasonable-adjustments-triage',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/reasonableAdjustmentsTriage.njk`,
  // "Continue to the questions" (reasonableAdjustmentsChoice=questions) launches the Your Support
  // microsite when cui-ra is healthy. If cui-ra is unavailable, or the citizen chose "I do not
  // need any support" (reasonableAdjustmentsChoice=skip), we instead continue the response journey
  // at the language-used page.
  beforeRedirect: async (req: Request) => {
    if (req.body.reasonableAdjustmentsChoice === 'questions') {
      const micrositeUrl = await startYourSupport(req); // null when cui-ra is unhealthy → skip YS
      if (micrositeUrl) {
        req.res?.redirect(303, micrositeUrl); // postHandler short-circuits on res.headersSent
        return;
      }
    }
    // Reached by the "I do not need any support at this time" (skip) button, and also when Your
    // Support is skipped because cui-ra is unavailable: continue the response journey.
    // TODO (HDPI-7379, INTERIM until the PCQ integration wires the RA journey): we redirect
    // EXPLICITLY only because reasonable-adjustments-triage is a NON-section step (flow.config
    // `nonSectionStepOrder`): getNextStep from a non-section step never traverses into the
    // checkYourAnswersAndSubmit section, where language-used lives. If triage is later moved back
    // into that section (immediately before language-used), delete this redirect — the normal
    // next-step flow will route there automatically. Track in Jira.
    const caseReference = req.res?.locals.validatedCase?.id;
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
