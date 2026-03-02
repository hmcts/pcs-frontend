import { Page } from '@playwright/test';

import { defendantNameCapture, freeLegalAdvice } from '../data/page-data';
import { performAction, performValidation } from '../utils/controller';

export async function freeLegalAdviceErrorValidation(): Promise<void> {
  await performAction('clickButton', defendantNameCapture.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: freeLegalAdvice.thereIsAProbelmErrorMessageHeader,
    message: freeLegalAdvice.youMustSayAboutFreeLegalAdviceErrorMessage,
  });
}

export async function freeLegalAdviceNavigationTests(page: Page): Promise<void> {
  const currentPage = page.url();
  await performAction('clickRadioButton', freeLegalAdvice.yesRadioOption);
  await performAction('clickButton', freeLegalAdvice.saveForLaterButton);
  await performValidation('pageNavigation', 'Dashboard');
  await performAction('navigateToUrl', currentPage);
}
