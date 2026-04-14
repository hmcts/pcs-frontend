import type { Request } from 'express';

import { getValidatedCaseHouseholdCircumstances } from './getValidatedCaseHouseholdCircumstances';
import { fromYesNoEnum } from './yesNoEnum';

export const hasSelectedUniversalCredit = async (req: Request): Promise<boolean> => {
  const universalCredit = getValidatedCaseHouseholdCircumstances(req)?.universalCredit;

  return fromYesNoEnum(universalCredit) === 'yes';
};
