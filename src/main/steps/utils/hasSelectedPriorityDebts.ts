import type { Request } from 'express';

import { getValidatedCaseHouseholdCircumstances } from './getValidatedCaseHouseholdCircumstances';
import { fromYesNoEnum } from './yesNoEnum';

// "Citizen has answered YES to priority debts" — read from the saved CCD flag rather
// than downstream debt-detail fields, because the answer is recorded by `priority-debts`
// before any detail fields exist. The access guard on the GET that follows the POST
// to `priority-debts` needs this to recognise the just-saved YES; otherwise it routes
// the citizen back to the task-list before they can answer the details questions.
export const hasSelectedPriorityDebts = (req: Request): boolean => {
  return fromYesNoEnum(getValidatedCaseHouseholdCircumstances(req)?.priorityDebts) === 'yes';
};
