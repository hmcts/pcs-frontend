import { createRespondToClaimFormStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import { clientContextSessionClearer } from '@utils/clientContextSessionClearer';
import { getCaseManagementUrl } from '@utils/legalRepresentativeRedirectHandler';

export const step: StepDefinition = createRespondToClaimFormStep({
  stepName: 'response-submitted',
  stepDir: __dirname,
  fields: [],
  translationKeys: {
    pageTitle: 'pageTitle',
    responseSubmittedParagraph1: 'responseSubmittedParagraph1',
    responseSubmittedHeading1: 'responseSubmittedHeading1',
    responseSubmittedListItem1: 'responseSubmittedListItem1',
    responseSubmittedListItem2: 'responseSubmittedListItem2',
    responseSubmittedHeading2: 'responseSubmittedHeading2',
    responseSubmittedParagraph2: 'responseSubmittedParagraph2',
    closeAndReturnToCaseOverview: 'closeAndReturnToCaseOverview',
  },
  customTemplate: `${__dirname}/responseSubmitted.njk`,
  extendGetContent: req => {
    clientContextSessionClearer(req);
    return {
      backUrl: '',
      closeUrl: getCaseManagementUrl(req),
    };
  },
});
