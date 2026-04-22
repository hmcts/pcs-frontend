import type { Request } from 'express';

import { buildDraftDefendantResponse } from '../../utils/buildDraftDefendantResponse';
import { flowConfig } from '../flow.config';

import { createFormStep } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import type { YesNoNotSureValue } from '@services/ccdCase.interface';
import { ccdCaseService } from '@services/ccdCaseService';

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
    const response = buildDraftDefendantResponse(req);
    const writtenTerms: YesNoNotSureValue | undefined = req.body?.writtenTerms;

    if (writtenTerms) {
      response.defendantResponses.writtenTerms = writtenTerms;
    } else {
      delete response.defendantResponses.writtenTerms;
    }

    await ccdCaseService.saveDraftDefendantResponse(
      req.session?.user?.accessToken,
      req.res?.locals.validatedCase?.id || '',
      response
    );
  },
});
