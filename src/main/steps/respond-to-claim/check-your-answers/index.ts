import type { Request } from 'express';

import { createRespondToClaimFormStep } from '../formStep';

import { getTranslationFunction } from '@modules/steps';
import { buildErrorSummary } from '@modules/steps/formBuilder/errorUtils';
import type { FormFieldConfig } from '@modules/steps/formBuilder/formFieldConfig.interface';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';

// Field config override for the submit error when submitting the response fails
const submitResponseErrorFields: FormFieldConfig[] = [{ name: 'submitResponse', type: 'text' }];

export const step: StepDefinition = createRespondToClaimFormStep({
  stepName: 'check-your-answers',
  stepDir: __dirname,
  fields: [],
  translationKeys: {
    pageTitle: 'pageTitle',
  },
  customTemplate: `${__dirname}/checkYourAnswers.njk`,
  extendGetContent: (req: Request) => {
    if (req.query.submitError !== 'failed') {
      return {};
    }

    const t = getTranslationFunction(req, 'check-your-answers', ['common']);
    const translated = t('errors.submitResponseFailed');
    const message =
      translated && translated !== 'errors.submitResponseFailed'
        ? translated
        : 'Failed to submit response. Please try again.';

    const errorSummary = buildErrorSummary({ submitResponse: message }, submitResponseErrorFields, t);

    return errorSummary ? { errorSummary } : {};
  },
});
