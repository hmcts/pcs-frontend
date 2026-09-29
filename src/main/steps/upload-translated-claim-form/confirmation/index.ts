import type { Request } from 'express';

import { getCaseTitleData } from '../../utils/getCaseTitleData';
import { buildCaseOverviewUrl } from '../../utils/xuiLinkBuilder';
import { flowConfig } from '../flow.config';

import { createFormStep } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';

const STEP_NAME = 'confirmation';
const JOURNEY_NAME = 'uploadTranslatedClaimForm';

export const step: StepDefinition = createFormStep({
  stepName: STEP_NAME,
  journeyFolder: JOURNEY_NAME,
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/confirmation.njk`,
  fields: [],
  translationKeys: {
    pageTitle: 'pageTitle',
    confirmationPanelTitle: 'confirmationPanelTitle',
    confirmationPanelBody: 'confirmationPanelBody',
  },
  extendGetContent: async (req: Request) => {
    const ccdCase = req.res?.locals.validatedCase;

    if (!ccdCase?.id) {
      // logger.error('Missing case reference');
      return {};
    }

    return {
      caseOverviewUrl: buildCaseOverviewUrl(ccdCase?.id),
      ...getCaseTitleData(req),
    };
  },
});
