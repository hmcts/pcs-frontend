import { dateField } from '../fieldBuilders';
import { createMakeAClaimStep } from '../formStep';
import { dateFromBody } from '../formValues';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createMakeAClaimStep({
  stepName: 'statement-period',
  stepDir: __dirname,
  fields: [
    dateField('statementStart'),
    dateField('statementEnd', {
      noFutureDate: false,
      validate: (_value, formData) => {
        const start = dateFromBody(formData, 'statementStart');
        const end = dateFromBody(formData, 'statementEnd');
        return start && end && end < start ? 'errors.statementEnd' : undefined;
      },
    }),
  ],
});
