import { confirmationOfNoticeDateWhenProvided } from '../data/page-data';
import { performAction, performValidation } from '../utils/controller';

export async function confirmationOfNoticeDateWhenProvidedErrorValidation(): Promise<void> {
  await performAction('enterNoticeDateKnown', {
    day: '25',
    month: '2',
    year: '2050',
  });
  await performValidation('errorMessage', {
    header: confirmationOfNoticeDateWhenProvided.thereIsAProblemErrorMessageHeader,
    message: confirmationOfNoticeDateWhenProvided.theDateYouReceiveNoticeErrorMessage,
  });
  await performAction('inputText', confirmationOfNoticeDateWhenProvided.yearTextLabel, '2000');
}
