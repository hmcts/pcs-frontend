import { contactByTextMessage } from '../../data/page-data';
import { performAction, performValidation } from '../../utils/controller';

export default async function contactByTextMessageErrorValidation(): Promise<void> {
  await performAction('clickButton', contactByTextMessage.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: contactByTextMessage.thereIsAProblemErrorMessageHeader,
    message: contactByTextMessage.SelectIfYouWantErrorMessage,
  });
}
