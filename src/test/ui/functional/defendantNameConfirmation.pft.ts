import { defendantNameConfirmation, freeLegalAdvice } from '../data/page-data';
import { performAction, performValidation } from '../utils/controller';

import { defendantNameCaptureInputValuesPrePopulated } from './defendantNameCapture.pft';

export async function defendantNameConfirmationNavigationTests(): Promise<void> {
  await performValidation('pageNavigation', defendantNameConfirmation.backLink, freeLegalAdvice.mainHeader);
  await performAction('clickRadioButton', {
    question: defendantNameConfirmation.mainHeader,
    option: defendantNameConfirmation.noRadioOption,
  });
  await defendantNameCaptureInputValuesPrePopulated();
}
