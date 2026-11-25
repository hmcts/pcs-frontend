import { isRendering } from '../../formStep';
import { claimIssueFee } from '../claimFee';
import { createStartStep } from '../startStep';

import { getTranslationFunction } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createStartStep({
  stepName: 'start',
  stepDir: __dirname,
  fields: [],
  customTemplate: 'make-a-claim/templates/start.njk',
  extendGetContent: async (req, formContent) => {
    const content = { startUrl: '/make-a-claim/claimant-type' };
    if (!isRendering(formContent)) {
      return content;
    }
    const t = getTranslationFunction(req);
    const fee = await claimIssueFee();
    return { ...content, feeText: fee ? t('feeKnown', { fee }) : t('feeUnknown') };
  },
});
