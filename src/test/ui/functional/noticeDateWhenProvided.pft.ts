import { noticeDateWhenProvided } from '../data/page-data';
import { performAction, performValidation } from '../utils/controller';

export async function noticeDateWhenProvidedErrorValidation(): Promise<void> {
  await performAction('enterNoticeDateKnown', {
    day: '25',
    month: '2',
    year: '2050',
  });
  await performValidation('errorMessage', {
    header: noticeDateWhenProvided.thereIsAProblemErrorMessageHeader,
    message: noticeDateWhenProvided.theDateYouReceiveNoticeErrorMessage,
  });
  await performAction('inputText', noticeDateWhenProvided.yearTextLabel, '2000');
}
