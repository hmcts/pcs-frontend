import { createRespondToClaimFormStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createRespondToClaimFormStep({
  stepName: 'reasonable-adjustments-confirmation',
  stepDir: __dirname,
  fields: [],
  customTemplate: `${__dirname}/reasonableAdjustmentsConfirmation.njk`,
  translationKeys: {
    pageTitle: 'pageTitle',
    heading: 'heading',
    submittedCaption: 'submittedCaption',
    whatHappensNextHeading: 'whatHappensNextHeading',
    whatHappensNextParagraph1: 'whatHappensNextParagraph1',
    whatHappensNextParagraph2: 'whatHappensNextParagraph2',
  },
  // TODO (HDPI-7379, INTERIM until the PCQ integration wires the RA journey): "Save and continue"
  // returns the citizen to their response journey at the language-used page. We redirect
  // EXPLICITLY only because reasonable-adjustments-confirmation is currently a NON-section step
  // (flow.config `nonSectionStepOrder`): getNextStep from a non-section step never traverses into
  // the checkYourAnswersAndSubmit section where language-used lives (and, as the last non-section
  // step, its next-step would otherwise be null → 500). If this is later moved into that section
  // before language-used, delete this — the normal next-step flow will route there automatically.
  // ("Save for later" is unaffected — postHandler handles it before this hook.) Track in Jira.
  resolveRedirectAfterPost: async req => {
    const caseReference = req.res?.locals.validatedCase?.id;
    return caseReference ? `/case/${caseReference}/respond-to-claim/language-used` : undefined;
  },
});
