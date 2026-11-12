import { readClaim } from '../claimDraft';
import { yesNoQuestion } from '../fieldBuilders';
import { flowConfig } from '../flow.config';
import { createMakeAClaimStep } from '../formStep';
import { defendantDisplayName } from '../summary';

import { getTranslationFunction } from '@modules/steps';
import { getStepUrl } from '@modules/steps/flow';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createMakeAClaimStep({
  stepName: 'additional-defendants',
  stepDir: __dirname,
  // The question is the page's H1, shown above the defendants list, so the radios' legend repeats it unseen.
  fields: [yesNoQuestion('additionalDefendants', { isPageHeading: false, legendClasses: 'govuk-visually-hidden' })],
  extendGetContent: req => ({
    heading: getTranslationFunction(req)('question'),
    listItems: (readClaim(req).defendants ?? []).map(defendant => defendantDisplayName(defendant.value, req)),
  }),
  resolveRedirectAfterPost: async req => {
    if (req.body?.additionalDefendants !== 'yes') {
      return undefined;
    }
    const next = readClaim(req).defendants?.length ?? 1;
    return `${getStepUrl('defendant-name', flowConfig, req.res?.locals.validatedCase?.id)}?index=${next}`;
  },
});
