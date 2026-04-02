import { contactPreferencesTelephone, contactPreferencesTextMessage, dashboard, feedback } from '../data/page-data';
import { performAction, performValidation } from '../utils/controller';

export async function contactPreferencesTextMessageErrorValidation(): Promise<void> {
  await performAction('clickButton', contactPreferencesTextMessage.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: contactPreferencesTextMessage.thereIsAProblemErrorMessageHeader,
    message: contactPreferencesTextMessage.selectIfYouWantErrorMessage,
  });
}

export async function contactPreferencesTextMessageNavigationTests(): Promise<void> {
  await performValidation('pageNavigation', contactPreferencesTextMessage.feedbackLink, {
    element: feedback.tellUsWhatYouThinkParagraph,
    pageSlug: contactPreferencesTextMessage.pageSlug,
  });
  await performValidation(
    'pageNavigation',
    contactPreferencesTextMessage.backLink,
    contactPreferencesTelephone.mainHeader
  );
  await performAction('clickRadioButton', {
    question: contactPreferencesTextMessage.contactByTextMessageQuestion,
    option: contactPreferencesTextMessage.yesRadioOption,
  });
  await performValidation('pageNavigation', contactPreferencesTextMessage.saveForLaterButton, dashboard.mainHeader);
}
