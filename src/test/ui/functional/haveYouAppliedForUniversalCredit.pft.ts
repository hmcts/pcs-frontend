import { dashboard, feedback, haveYouAppliedForUniversalCredit, regularIncome } from '../data/page-data';
import { performAction, performValidation } from '../utils/controller';

export async function haveYouAppliedForUniversalCreditErrorValidation(): Promise<void> {
  await performAction('clickButton', haveYouAppliedForUniversalCredit.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: haveYouAppliedForUniversalCredit.errorValidationHeader,
    message: haveYouAppliedForUniversalCredit.selectIfYouHaveErrorMessage,
  });

  //This error message will trigger if no date is provided
  await performAction('clickRadioButton', {
    question: haveYouAppliedForUniversalCredit.mainHeader,
    option: haveYouAppliedForUniversalCredit.yesRadioOption,
  });
  await performAction('inputText', haveYouAppliedForUniversalCredit.dayHiddenTextLabel, ' ');
  await performAction('inputText', haveYouAppliedForUniversalCredit.monthHiddenTextLabel, ' ');
  await performAction('inputText', haveYouAppliedForUniversalCredit.yearHiddenTextLabel, ' ');
  await performAction('clickButton', haveYouAppliedForUniversalCredit.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: haveYouAppliedForUniversalCredit.errorValidationHeader,
    message: haveYouAppliedForUniversalCredit.enterTheDateYouAppliedErrorMessage,
  });

  //This error message will trigger if day is missing
  await performAction('clickRadioButton', {
    question: haveYouAppliedForUniversalCredit.mainHeader,
    option: haveYouAppliedForUniversalCredit.yesRadioOption,
  });
  await performAction('inputText', haveYouAppliedForUniversalCredit.dayHiddenTextLabel, ' ');
  await performAction('inputText', haveYouAppliedForUniversalCredit.monthHiddenTextLabel, '11');
  await performAction('inputText', haveYouAppliedForUniversalCredit.yearHiddenTextLabel, '2022');
  await performAction('clickButton', haveYouAppliedForUniversalCredit.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: haveYouAppliedForUniversalCredit.errorValidationHeader,
    message: haveYouAppliedForUniversalCredit.dayMissingErrorMessage,
  });

  //This error message will trigger if month is missing
  await performAction('clickRadioButton', {
    question: haveYouAppliedForUniversalCredit.mainHeader,
    option: haveYouAppliedForUniversalCredit.yesRadioOption,
  });
  await performAction('inputText', haveYouAppliedForUniversalCredit.dayHiddenTextLabel, '12');
  await performAction('inputText', haveYouAppliedForUniversalCredit.monthHiddenTextLabel, ' ');
  await performAction('inputText', haveYouAppliedForUniversalCredit.yearHiddenTextLabel, '2022');
  await performAction('clickButton', haveYouAppliedForUniversalCredit.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: haveYouAppliedForUniversalCredit.errorValidationHeader,
    message: haveYouAppliedForUniversalCredit.monthMissingErrorMessage,
  });

  //This error message will trigger if year is missing
  await performAction('clickRadioButton', {
    question: haveYouAppliedForUniversalCredit.mainHeader,
    option: haveYouAppliedForUniversalCredit.yesRadioOption,
  });
  await performAction('inputText', haveYouAppliedForUniversalCredit.monthHiddenTextLabel, '11');
  await performAction('inputText', haveYouAppliedForUniversalCredit.monthHiddenTextLabel, '11');
  await performAction('inputText', haveYouAppliedForUniversalCredit.yearHiddenTextLabel, ' ');
  await performAction('clickButton', haveYouAppliedForUniversalCredit.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: haveYouAppliedForUniversalCredit.errorValidationHeader,
    message: haveYouAppliedForUniversalCredit.yearMissingErrorMessage,
  });

  //This error message will trigger if invalid date is provided
  await performAction('clickRadioButton', {
    question: haveYouAppliedForUniversalCredit.mainHeader,
    option: haveYouAppliedForUniversalCredit.yesRadioOption,
  });
  await performAction('inputText', haveYouAppliedForUniversalCredit.dayHiddenTextLabel, '32');
  await performAction('inputText', haveYouAppliedForUniversalCredit.monthHiddenTextLabel, '11');
  await performAction('inputText', haveYouAppliedForUniversalCredit.yearHiddenTextLabel, '2025');
  await performAction('clickButton', haveYouAppliedForUniversalCredit.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: haveYouAppliedForUniversalCredit.errorValidationHeader,
    message: haveYouAppliedForUniversalCredit.realDateErrorMessage,
  });

  //This error message will trigger if future date is provided
  await performAction('clickRadioButton', {
    question: haveYouAppliedForUniversalCredit.mainHeader,
    option: haveYouAppliedForUniversalCredit.yesRadioOption,
  });
  await performAction('inputText', haveYouAppliedForUniversalCredit.dayHiddenTextLabel, '20');
  await performAction('inputText', haveYouAppliedForUniversalCredit.monthHiddenTextLabel, '11');
  await performAction('inputText', haveYouAppliedForUniversalCredit.yearHiddenTextLabel, '2030');
  await performAction('clickButton', haveYouAppliedForUniversalCredit.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: haveYouAppliedForUniversalCredit.errorValidationHeader,
    message: haveYouAppliedForUniversalCredit.futureDateErrorMessage,
  });
}

export async function haveYouAppliedForUniversalCreditNavigationTests(): Promise<void> {
  await performValidation('pageNavigation', haveYouAppliedForUniversalCredit.feedbackLink, {
    element: feedback.tellUsWhatYouThinkParagraph,
    pageSlug: haveYouAppliedForUniversalCredit.pageSlug,
  });
  await performValidation('pageNavigation', haveYouAppliedForUniversalCredit.backLink, regularIncome.mainHeader);
  await performAction('clickRadioButton', haveYouAppliedForUniversalCredit.noRadioOption);
  await performValidation('pageNavigation', haveYouAppliedForUniversalCredit.saveForLaterButton, dashboard.mainHeader);
}
