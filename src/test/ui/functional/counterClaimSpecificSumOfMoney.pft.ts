import { counterClaimSpecificSumOfMoney, counterClaimWhatAreYouClaimingFor, feedback } from '../data/page-data';
import { performAction, performValidation } from '../utils/controller';

export async function counterClaimSpecificSumErrorValidation(): Promise<void> {
  await performAction('When the user clicks the button', counterClaimSpecificSumOfMoney.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: counterClaimSpecificSumOfMoney.thereIsAProblemErrorMessageHeader,
    message: counterClaimSpecificSumOfMoney.specificSumRequiredErrorMessage,
  });

  await performAction('clickRadioButton', counterClaimSpecificSumOfMoney.yesRadioOption);
  await performAction('When the user clicks the button', counterClaimSpecificSumOfMoney.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: counterClaimSpecificSumOfMoney.thereIsAProblemErrorMessageHeader,
    message: counterClaimSpecificSumOfMoney.enterHowMuchYouAreClaimingErrorMessage,
  });

  await performAction('inputText', counterClaimSpecificSumOfMoney.howMuchAreYouClaimingHiddenQuestion, counterClaimSpecificSumOfMoney.billionTextInput);
  await performAction('When the user clicks the button', counterClaimSpecificSumOfMoney.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: counterClaimSpecificSumOfMoney.thereIsAProblemErrorMessageHeader,
    message: counterClaimSpecificSumOfMoney.billionClaimErrorMessage,
  });

  await performAction('inputText', counterClaimSpecificSumOfMoney.howMuchAreYouClaimingHiddenQuestion, counterClaimSpecificSumOfMoney.negativeInput);
  await performAction('When the user clicks the button', counterClaimSpecificSumOfMoney.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: counterClaimSpecificSumOfMoney.thereIsAProblemErrorMessageHeader,
    message: counterClaimSpecificSumOfMoney.negativeClaimInputErrorMessage,
  });
  await performAction('clickRadioButton', counterClaimSpecificSumOfMoney.noRadioOption);
  await performAction('When the user clicks the button', counterClaimSpecificSumOfMoney.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: counterClaimSpecificSumOfMoney.thereIsAProblemErrorMessageHeader,
    message: counterClaimSpecificSumOfMoney.enterMaxValueErrorMessage,
  });
  await performAction('inputText', counterClaimSpecificSumOfMoney.maximumValueOfYourClaimHiddenQuestion, counterClaimSpecificSumOfMoney.billionTextInput);
  await performAction('When the user clicks the button', counterClaimSpecificSumOfMoney.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: counterClaimSpecificSumOfMoney.thereIsAProblemErrorMessageHeader,
    message: counterClaimSpecificSumOfMoney.maximumValueBillionErrorMessage,
  });
  await performAction('inputText', counterClaimSpecificSumOfMoney.maximumValueOfYourClaimHiddenQuestion, counterClaimSpecificSumOfMoney.negativeInput);
  await performAction('When the user clicks the button', counterClaimSpecificSumOfMoney.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: counterClaimSpecificSumOfMoney.thereIsAProblemErrorMessageHeader,
    message: counterClaimSpecificSumOfMoney.negativeMaxValueErrorMessage,
  });
}

export async function counterClaimSpecificSumNavigationTests(): Promise<void> {
  await performValidation('pageNavigation', counterClaimSpecificSumOfMoney.feedbackLink, {
    element: feedback.tellUsWhatYouThinkParagraph,
    pageSlug: counterClaimWhatAreYouClaimingFor.pageSlug,
  });
  await performValidation('pageNavigation', counterClaimSpecificSumOfMoney.backLink, counterClaimWhatAreYouClaimingFor.mainHeader);
}
