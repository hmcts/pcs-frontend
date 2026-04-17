import { getClaimantName } from '../../utils/getClaimantName';
import { flowConfig } from '../flow.config';

import { createFormStep, getTranslationFunction } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createFormStep({
  stepName: 'dispute-claim-interstitial',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/disputeClaimInterstitial.njk`,
  translationKeys: {
    pageTitle: 'pageTitle',
    caption: 'caption',
    paragraph2: 'paragraph2',
    paragraph3: 'paragraph3',
    listItem1: 'listItem1',
    listItem2: 'listItem2',
    listItem3: 'listItem3',
  },
  fields: [],
  extendGetContent: req => {
    const claimantName = getClaimantName(req);
    const t = getTranslationFunction(req, 'dispute-claim-interstitial', ['common']);

    return {
      heading: t('heading', { claimantName }),
      paragraph1: t('paragraph1', { claimantName }),
    };
  },
});
