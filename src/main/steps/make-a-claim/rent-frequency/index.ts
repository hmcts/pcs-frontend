import { readClaim } from '../claimDraft';
import { RENT_FREQUENCIES, rentChangeExceedsLimit } from '../claimMapping';
import { radioQuestion, textField } from '../fieldBuilders';
import { FIELD_LIMITS } from '../fieldLimits';
import { createMakeAClaimStep } from '../formStep';
import { oneOf } from '../formValues';
import { MAX_RENT_PERIODS } from '../rentHistory';

import { getTranslationFunction } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createMakeAClaimStep({
  stepName: 'rent-frequency',
  stepDir: __dirname,
  fields: [
    radioQuestion('rentFrequency', RENT_FREQUENCIES, {
      validate: (value, _formData, _allData, req) =>
        req && rentChangeExceedsLimit(readClaim(req), req, { rentFrequency: oneOf(value, RENT_FREQUENCIES) })
          ? getTranslationFunction(req)('errors.tooManyPeriods', { limit: MAX_RENT_PERIODS })
          : undefined,
      subFields: {
        OTHER: {
          otherFrequencyDetails: textField('otherFrequencyDetails', {
            maxLength: FIELD_LIMITS.otherFrequencyDetails,
            errorMessage: 'errors.otherFrequencyDetails',
          }),
        },
      },
    }),
  ],
});
