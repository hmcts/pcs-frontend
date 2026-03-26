import { repaymentsAgreed } from '../data/page-data';
import { claimantsName } from '../utils/actions/custom-actions';
import { performAction, performValidation } from '../utils/controller';

const overMaxLengthString = 'A'.repeat(501);
export async function repaymentsAgreedErrorValidation(): Promise<void> {
  await performAction('clickButton', repaymentsAgreed.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: repaymentsAgreed.thereIsAProblemErrorMessageHeader,
    message: repaymentsAgreed.getSelectAgreementErrorMessage(claimantsName),
  });
  await performAction('clickRadioButton', repaymentsAgreed.yesRadioOption);
  await performValidation('elementToBeVisible', repaymentsAgreed.youCanEnterUpToHiddenHintText);
  await performAction('inputText', repaymentsAgreed.giveDetailsHiddenHintText, overMaxLengthString);
  await performValidation('elementToBeVisible', repaymentsAgreed.tooManyCharacterHiddenHintText);
  await performAction('clickButton', repaymentsAgreed.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: repaymentsAgreed.thereIsAProblemErrorMessageHeader,
    message: repaymentsAgreed.mustBe500CharactersOrFewerErrorMessage,
  });
}

//The below method is commented out as we have an open bug - HDPI-5556
/*
export async function repaymentsAgreedNavigationTests(): Promise<void> {
  await performValidation('pageNavigation', repaymentsAgreed.backLink, repaymentsMade.mainHeader);
  await performAction('clickRadioButton', repaymentsAgreed.noRadioOption);
  await performValidation('pageNavigation', repaymentsAgreed.saveForLaterButton, dashboard.mainHeader);
}
*/
