import { getClaimantName } from '../../utils/getClaimantName';
import { createRespondToClaimFormStep } from '../formStep';

import { getTranslationFunction } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createRespondToClaimFormStep({
  stepName: 'payment-interstitial',
  stepDir: __dirname,
  customTemplate: `${__dirname}/paymentInterstitial.njk`,
  translationKeys: {
    pageTitle: 'pageTitle',
    heading: 'heading',
    caption: 'caption',
    paragraph2: 'paragraph2',
    paragraph3: 'paragraph3',
    paragraph4: 'paragraph4',
    bullet1: 'bullet1',
    bullet2: 'bullet2',
  },
  fields: [],
  extendGetContent: req => {
    const claimantName = getClaimantName(req);
    const t = getTranslationFunction(req, 'payment-interstitial', ['common']);

    return {
      paragraph1: t('paragraph1', { claimantName }),
    };
  },
});
