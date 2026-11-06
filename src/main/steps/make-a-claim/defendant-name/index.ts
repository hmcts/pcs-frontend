import { defendantIndexOf } from '../claimMapping';
import { textField, yesNoQuestion } from '../fieldBuilders';
import { FIELD_LIMITS } from '../fieldLimits';
import { flowConfig } from '../flow.config';
import { createMakeAClaimStep } from '../formStep';

import { getStepUrl } from '@modules/steps/flow';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createMakeAClaimStep({
  stepName: 'defendant-name',
  stepDir: __dirname,
  fields: [
    yesNoQuestion('nameKnown', {
      subFields: {
        yes: {
          firstName: textField('firstName', {
            maxLength: FIELD_LIMITS.defendantFirstName,
            errorMessage: 'errors.firstName',
          }),
          lastName: textField('lastName', {
            maxLength: FIELD_LIMITS.defendantLastName,
            errorMessage: 'errors.lastName',
          }),
        },
      },
    }),
  ],
  resolveRedirectAfterPost: async req => {
    const index = defendantIndexOf(req);
    const url = getStepUrl('defendant-address', flowConfig, req.res?.locals.validatedCase?.id);
    return index > 0 ? `${url}?index=${index}` : undefined;
  },
});
