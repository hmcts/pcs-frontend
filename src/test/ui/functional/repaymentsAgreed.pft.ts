import { repaymentsAgreed, repaymentsMade } from '../data/page-data';
import { performAction, performValidation } from '../utils/controller';

export async function contactByTelephoneErrorValidation(): Promise<void> {
  await performAction('clickButton', repaymentsMade.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: repaymentsAgreed.thereIsAProblemErrorMessageHeader,
    message: repaymentsAgreed.selectAgreementErrorMessage,
  });
  await performAction('clickRadioButton', repaymentsAgreed.yesRadioOption);
  await performValidation('elementToBeVisible', repaymentsAgreed.youCanEnterUpToHiddenHintText);
  await performAction(
    'inputText',
    repaymentsAgreed.giveDetailsHiddenHintText,
    repaymentsAgreed.detailsCharLimitInputText
  );
  await performValidation('elementToBeVisible', repaymentsAgreed.tooManyCharacterHiddenHintText);
}

export async function freeLegalAdviceNavigationTests(): Promise<void> {
  await performValidation('pageNavigation', repaymentsAgreed.backLink, repaymentsMade.mainHeader);
  await performAction('clickRadioButton', repaymentsAgreed.yesRadioOption);
  await performValidation('pageNavigation', repaymentsAgreed.saveForLaterButton, 'Dashboard');
}
