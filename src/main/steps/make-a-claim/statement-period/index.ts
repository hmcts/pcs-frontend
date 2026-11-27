import type { Request } from 'express';

import { readClaim } from '../claimDraft';
import { dateField } from '../fieldBuilders';
import { createMakeAClaimStep } from '../formStep';
import { type FormBody, dateFromBody, isReadable } from '../formValues';
import { MAX_RENT_PERIODS, exceedsRentPeriodLimit } from '../rentHistory';

import { getTranslationFunction } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';

/** Refuses a period with more rent periods than the statement can show, rather than dropping the later ones. */
function tooManyPeriods(formData: FormBody, req: Request | undefined): string | undefined {
  const statementStart = dateFromBody(formData, 'statementStart');
  const statementEnd = dateFromBody(formData, 'statementEnd');
  const rentArrears = req ? readClaim(req).rentArrears : undefined;
  if (!req || !statementStart || !statementEnd || !rentArrears?.rentFrequency || !isReadable(rentArrears.rentAmount)) {
    return undefined;
  }
  const exceeds = exceedsRentPeriodLimit({
    rentAmount: rentArrears.rentAmount,
    rentFrequency: rentArrears.rentFrequency,
    rentDueDay: rentArrears.rentDueDay,
    statementStart,
    statementEnd,
  });
  return exceeds ? getTranslationFunction(req)('errors.tooManyPeriods', { limit: MAX_RENT_PERIODS }) : undefined;
}

export const step: StepDefinition = createMakeAClaimStep({
  stepName: 'statement-period',
  stepDir: __dirname,
  fields: [
    dateField('statementStart'),
    dateField('statementEnd', {
      validate: (_value, formData, _allData, req) => {
        const start = dateFromBody(formData, 'statementStart');
        const end = dateFromBody(formData, 'statementEnd');
        return start && end && end < start ? 'errors.statementEnd' : tooManyPeriods(formData, req);
      },
    }),
  ],
});
