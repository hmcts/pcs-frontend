import { dashboard, paymentInterstitial, repaymentsMade } from '../data/page-data';
import { performAction, performValidation } from '../utils/controller';

export async function repaymentsMadeErrorValidation(): Promise<void> {
  await performAction('clickButton', repaymentsMade.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: repaymentsMade.thereIsAProblemErrorMessageHeader,
    message: repaymentsMade.selectIfYouPaidAnyMoneyErrorMessage,
  });

  await performAction('clickRadioButton', repaymentsMade.yesRadioOption);
  await performAction('clickButton', repaymentsMade.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: repaymentsMade.thereIsAProblemErrorMessageHeader,
    message: repaymentsMade.giveDetailsAboutHowMuchYouPaidErrorMessage,
  });

  await performAction('clickRadioButton', repaymentsMade.yesRadioOption);
  await performAction('inputText', repaymentsMade.giveDetailsHiddenTextLabel, repaymentsMade.detailsCharLimitInputText);
  await performAction('clickButton', repaymentsMade.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: repaymentsMade.thereIsAProblemErrorMessageHeader,
    message: repaymentsMade.mustBeUnderCharacterLimitErrorMessage,
  });
}

export async function repaymentsMadeNavigationTests(): Promise<void> {
  await performValidation('pageNavigation', repaymentsMade.backLink, paymentInterstitial.mainHeader);
  await performAction('clickRadioButton', repaymentsMade.yesRadioOption);
  await performAction('inputText', repaymentsMade.giveDetailsHiddenTextLabel, repaymentsMade.detailsTextInput);
  await performValidation('pageNavigation', repaymentsMade.saveForLaterButton, dashboard.mainHeader);
}
