import { readClaim } from '../claimDraft';
import { caseReferenceOf } from '../formStep';
import { pageAfterSupport, startClaimantYourSupport } from '../handOffs';
import { createInterstitialStep } from '../interstitialStep';

import { Logger } from '@modules/logger';
import { getTranslationFunction } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import { isCuiYourSupportEnabled } from '@utils/isCuiYourSupportEnabled';

const logger = Logger.getLogger('makeAClaimYourSupport');

export const step: StepDefinition = createInterstitialStep('your-support', __dirname, {
  customTemplate: 'make-a-claim/templates/handOff.njk',
  extendGetContent: async req => {
    const t = getTranslationFunction(req);
    return {
      handOffAvailable: await isCuiYourSupportEnabled(req),
      continueButton: t('continueButton'),
      skipButton: t('skipButton'),
    };
  },
  beforeRedirect: async req => {
    if (req.body?.choice !== 'continue' || !(await isCuiYourSupportEnabled(req))) {
      return;
    }
    try {
      req.res?.redirect(303, await startClaimantYourSupport(req));
    } catch (error) {
      // Support is optional, so a failure to reach Your Support must not stop the claim
      logger.error(`Failed to launch Your Support for case ${caseReferenceOf(req)}`, error);
    }
  },
  resolveRedirectAfterPost: async req => pageAfterSupport(req, readClaim(req), caseReferenceOf(req)),
});
