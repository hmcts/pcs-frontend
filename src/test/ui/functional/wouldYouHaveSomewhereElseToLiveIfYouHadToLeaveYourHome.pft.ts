import {
  dashboard,
  doAnyOtherAdultsLiveInYourHome,
  feedback,
  wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome,
} from '../data/page-data';
import { getRelativeDate } from '../utils/common/string.utils';
import { performAction, performValidation } from '../utils/controller';

export async function wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHomeErrorValidation(): Promise<void> {
  //mandatory selection
  await performAction('clickButton', wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome.thereIsAProblemErrorMessageHeader,
    message: wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome.selectIfYouHadAlternativeAccommodationErrorMessage,
  });

  //This error message will trigger if no day is provided
  await performAction('clickRadioButton', {
    question: wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome.mainHeader,
    option: wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome.yesRadioOption,
  });
  await performAction('inputText', wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome.monthHiddenTextLabel, '11');
  await performAction('inputText', wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome.yearHiddenTextLabel, '2022');
  await performAction('clickButton', wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome.thereIsAProblemErrorMessageHeader,
    message: wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome.dayMissingErrorMessage,
  });

  //This error message will trigger if no month value is provided
  await performAction('inputText', wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome.dayHiddenTextLabel, '12');
  await performAction('inputText', wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome.monthHiddenTextLabel, '');
  await performAction('clickButton', wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome.thereIsAProblemErrorMessageHeader,
    message: wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome.monthMissingErrorMessage,
  });

  //This error message will trigger if no year value is provided
  await performAction('inputText', wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome.monthHiddenTextLabel, '11');
  await performAction('inputText', wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome.yearHiddenTextLabel, '');
  await performAction('clickButton', wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome.thereIsAProblemErrorMessageHeader,
    message: wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome.yearMissingErrorMessage,
  });

  //This error message will trigger if invalid date is provided
  await performAction('inputText', wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome.dayHiddenTextLabel, '32');
  await performAction('inputText', wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome.yearHiddenTextLabel, '2025');
  await performAction('clickButton', wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome.thereIsAProblemErrorMessageHeader,
    message: wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome.realDateErrorMessage,
  });

  //This error message will trigger if present date is entered
  await performAction('selectAlternativeAccommodation', {
    radioOption: wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome.yesRadioOption,
    ...getRelativeDate(0),
  });
  await performValidation('errorMessage', {
    header: wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome.thereIsAProblemErrorMessageHeader,
    message: wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome.futureDateErrorMessage,
  });

  //This error message will trigger if past date is provided
  await performAction('selectAlternativeAccommodation', {
    radioOption: wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome.yesRadioOption,
    ...getRelativeDate(-2),
  });
  await performValidation('errorMessage', {
    header: wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome.thereIsAProblemErrorMessageHeader,
    message: wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome.futureDateErrorMessage,
  });
}

export async function wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHomeNavigationTests(): Promise<void> {
  await performValidation('pageNavigation', wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome.feedbackLink, {
    element: feedback.tellUsWhatYouThinkParagraph,
    pageSlug: wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome.pageSlug,
  });
  await performValidation(
    'pageNavigation',
    wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome.backLink,
    doAnyOtherAdultsLiveInYourHome.mainHeader
  );
  await performAction('clickRadioButton', {
    question: wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome.mainHeader,
    option: wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome.noRadioOption,
  });
  await performValidation(
    'pageNavigation',
    wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome.saveForLaterButton,
    dashboard.mainHeader
  );
}
