import { contactPreferencesTelephone, contactPreferencesTextMessage } from '../data/page-data';
import { performAction, performValidation } from '../utils/controller';

export async function contactPreferencesTextMessageNavigationTests(): Promise<void> {
  await performValidation(
    'pageNavigation',
    contactPreferencesTextMessage.backLink,
    contactPreferencesTelephone.mainHeader
  );
  await performAction('clickRadioButton', {
    question: contactPreferencesTextMessage.contactByTextMessageQuestion,
    option: contactPreferencesTextMessage.yesRadioOption,
  });
  await performValidation('pageNavigation', contactPreferencesTextMessage.saveForLaterButton, 'Dashboard');
}
