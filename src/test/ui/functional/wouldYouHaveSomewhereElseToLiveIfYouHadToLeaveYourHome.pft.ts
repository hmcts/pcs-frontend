import {
  dashboard,
  doAnyOtherAdultsLiveInYourHome,
  feedback,
  wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome,
} from '../data/page-data';
import { performAction, performValidation } from '../utils/controller';

export async function wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHomeErrorValidation(): Promise<void> {
  //mandatory selection
  await performAction('clickButton', doAnyOtherAdultsLiveInYourHome.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome.thereIsAProblemErrorMessageHeader,
    message: wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome.selectIfYouHadAlternativeAccommodationErrorMessage,
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
