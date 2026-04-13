import type { Request } from 'express';

import type { YesNoNotSureValue } from '../../../interfaces/ccdCase.interface';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { getDraftDefendantResponse, saveDraftDefendantResponse } from '../../utils/draftDefendantResponse';
import { flowConfig } from '../flow.config';

import { createFormStep } from '@modules/steps';

const STEP_NAME = 'written-terms';

export const step: StepDefinition = createFormStep({
  stepName: STEP_NAME,
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/writtenTerms.njk`,
  translationKeys: {
    caption: 'caption',
    pageTitle: 'pageTitle',
    introText: 'introText',
  },
  fields: [
    {
      name: 'writtenTerms',
      type: 'radio',
      required: true,
      translationKey: {
        label: 'question',
      },
      legendClasses: 'govuk-fieldset__legend--m',
      options: [
        { value: 'YES', translationKey: 'options.yes' },
        { value: 'NO', translationKey: 'options.no' },
        { divider: 'options.or' },
        { value: 'NOT_SURE', translationKey: 'options.imNotSure' },
      ],
    },
  ],
  getInitialFormData: async req => {
    const caseData = req.res?.locals?.validatedCase?.data;
    const writtenTerms = caseData?.possessionClaimResponse?.defendantResponses?.writtenTerms as string | undefined;
    return { writtenTerms };
  },
  beforeRedirect: async (req: Request) => {
    const response = getDraftDefendantResponse(req);
    const writtenTerms: YesNoNotSureValue | undefined = req.body?.writtenTerms;

    if (writtenTerms) {
      response.defendantResponses.writtenTerms = writtenTerms;
    } else {
      delete response.defendantResponses.writtenTerms;
    }

    await saveDraftDefendantResponse(req, response);
  },
});
