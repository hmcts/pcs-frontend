import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { flowConfig } from '../flow.config';

import { createFormStep, getTranslationFunction } from '@modules/steps';

export const step: StepDefinition = createFormStep({
  stepName: 'reasonable-adjustments',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  fields: [],
  customTemplate: `${__dirname}/reasonableAdjustments.njk`,
  translationKeys: {
    pageTitle: 'pageTitle',
    caption: 'caption',
  },
  extendGetContent: req => {
    const t = getTranslationFunction(req, 'reasonable-adjustments', ['common']);
    return {
      bodyText: t('bodyText'),
    };
  },
});
