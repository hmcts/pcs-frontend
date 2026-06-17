import { createRespondToClaimFormStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createRespondToClaimFormStep({
  stepName: 'response-and-counter-claim-submitted',
  stepDir: __dirname,
  fields: [],
  translationKeys: {
    pageTitle: 'pageTitle',
    responseAndCounterClaimSubmittedParagraph1: 'responseAndCounterClaimSubmittedParagraph1',
    responseAndCounterClaimSubmittedHeading1: 'responseAndCounterClaimSubmittedHeading1',
    responseAndCounterClaimSubmittedListItem1: 'responseAndCounterClaimSubmittedListItem1',
    responseAndCounterClaimSubmittedListItem2: 'responseAndCounterClaimSubmittedListItem2',
    responseAndCounterClaimSubmittedHeading2: 'responseAndCounterClaimSubmittedHeading2',
    responseAndCounterClaimSubmittedParagraph2: 'responseAndCounterClaimSubmittedParagraph2',
    responseAndCounterClaimSubmittedParagraph3: 'responseAndCounterClaimSubmittedParagraph3',
    responseAndCounterClaimSubmittedParagraph4: 'responseAndCounterClaimSubmittedParagraph4',
    responseAndCounterClaimSubmittedParagraph5: 'responseAndCounterClaimSubmittedParagraph5',
    closeAndReturnToCaseOverview: 'closeAndReturnToCaseOverview',
  },
  customTemplate: `${__dirname}/responseAndCounterClaimSubmitted.njk`,
  extendGetContent: () => ({
    backUrl: '',
  }),
});
