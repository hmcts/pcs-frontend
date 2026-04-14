import { dashboard, feedback, howMuchAffordToPay, installmentPayments } from '../data/page-data';
import { performAction, performValidation } from '../utils/controller';

export async function howMuchAffordToPayErrorValidation(): Promise<void> {
  await performAction('clickButton', howMuchAffordToPay.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: howMuchAffordToPay.thereIsAProblemErrorMessageHeader,
    message1: howMuchAffordToPay.selectHowFrequentlyYouCouldAffordErrorMessage,
    message2: howMuchAffordToPay.enterHowMuchYouCouldAffordErrorMessage,
  });
  //amount exceeding max allowed value
  await performAction(
    'inputText',
    howMuchAffordToPay.howMuchCouldYouAffordToPayTextLabel,
    howMuchAffordToPay.billionTextInput
  );
  await performAction('clickRadioButton', howMuchAffordToPay.weeklyRadioOption);
  await performAction('clickButton', howMuchAffordToPay.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: howMuchAffordToPay.thereIsAProblemErrorMessageHeader,
    message: howMuchAffordToPay.mustBeLessThanBillionErrorMessage,
  });
  //negative value entered
  await performAction(
    'inputText',
    howMuchAffordToPay.howMuchCouldYouAffordToPayTextLabel,
    howMuchAffordToPay.negativeTextInput
  );
  await performAction('clickRadioButton', howMuchAffordToPay.every2WeeksRadioOption);
  await performAction('clickButton', howMuchAffordToPay.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: howMuchAffordToPay.thereIsAProblemErrorMessageHeader,
    message: howMuchAffordToPay.negativeValueErrorMessage,
  });
  //incorrect format
  await performAction(
    'inputText',
    howMuchAffordToPay.howMuchCouldYouAffordToPayTextLabel,
    howMuchAffordToPay.incorrectFormatTextInput
  );
  await performAction('clickRadioButton', howMuchAffordToPay.every4weeksRadioOption);
  await performAction('clickButton', howMuchAffordToPay.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: howMuchAffordToPay.thereIsAProblemErrorMessageHeader,
    message: howMuchAffordToPay.enterAmountInTheCorrectFormatErrorMessage,
  });
}

export async function howMuchAffordToPayNavigationTests(): Promise<void> {
  await performValidation('pageNavigation', howMuchAffordToPay.feedbackLink, {
    element: feedback.tellUsWhatYouThinkParagraph,
    pageSlug: howMuchAffordToPay.pageSlug,
  });
  await performValidation('pageNavigation', howMuchAffordToPay.backLink, installmentPayments.mainHeader);
  await performAction(
    'inputText',
    howMuchAffordToPay.howMuchCouldYouAffordToPayTextLabel,
    howMuchAffordToPay.affordToPayTextInput
  );
  await performAction('clickRadioButton', howMuchAffordToPay.monthlyRadioOption);
  await performValidation('pageNavigation', howMuchAffordToPay.saveForLaterButton, dashboard.mainHeader);
}
