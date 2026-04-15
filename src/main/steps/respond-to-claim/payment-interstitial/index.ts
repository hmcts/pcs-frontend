import { getClaimantName } from '../../utils/getClaimantName';
import { flowConfig } from '../flow.config';

import type { StepDefinition } from '@interfaces/stepFormData.interface';
import { createFormStep, getTranslationFunction } from '@modules/steps';

export const step: StepDefinition = createFormStep({
  stepName: 'payment-interstitial',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
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
