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
  // "Save and continue" returns the citizen to their response journey at language-used.
  // reasonable-adjustments-confirmation is a NON-section step (flow.config `nonSectionStepOrder`),
  // so getNextStep can't reach language-used — hence the explicit redirect. `nav=1` marks it as
  // internal navigation so the access guard allows direct entry to language-used, which is now a
  // MID-section step (RA triage is the first visible step of checkYourAnswersAndSubmit). "Save for
  // later" is unaffected — postHandler handles it before this hook.
  resolveRedirectAfterPost: async req => {
    const caseReference = req.res?.locals.validatedCase?.id;
    return caseReference ? `/case/${caseReference}/respond-to-claim/language-used?nav=1` : undefined;
  },
});
