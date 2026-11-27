import { HTTPError } from '../../../HttpError';
import { answeredClaim, readClaim } from '../claimDraft';
import { saveFromPage } from '../formStep';
import { startClaimantPcq } from '../handOffs';
import { createInterstitialStep } from '../interstitialStep';

import { getTranslationFunction } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createInterstitialStep('equality-and-diversity', __dirname, {
  customTemplate: 'make-a-claim/templates/handOff.njk',
  extendGetContent: req => {
    const t = getTranslationFunction(req);
    return { handOffAvailable: true, continueButton: t('continueButton'), skipButton: t('skipButton') };
  },
  beforeRedirect: async req => {
    const choice = req.body?.choice;
    if (choice !== 'continue' && choice !== 'skip') {
      throw new HTTPError('Invalid equality and diversity choice', 400);
    }
    const handOff = choice === 'continue' ? await startClaimantPcq(req) : null;
    if (choice === 'continue' && !handOff) {
      return;
    }
    await saveFromPage(
      req,
      answeredClaim(req, claim => {
        claim.otherInformation = {
          ...claim.otherInformation,
          equalityQuestionsChoice: handOff ? 'CONTINUE' : 'SKIP',
          ...(handOff ? { pcqId: handOff.pcqId } : {}),
        };
      }),
      readClaim(req).confirmedSections ?? []
    );
    if (handOff && !req.res?.headersSent) {
      req.res?.redirect(303, handOff.url);
    }
  },
});
