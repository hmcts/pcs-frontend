import { noticeDateWhenNotProvided } from '../../data/page-data/lr-page-data';
import { performAction, performValidation } from '../../utils/controller';

export async function noticeDateWhenNotProvidedErrorValidation(): Promise<void> {
  await performAction('enterNoticeDateUnknown', {
    day: '25',
    month: '2',
    year: '2050',
  });
  await performValidation('errorMessage', {
    header: noticeDateWhenNotProvided.thereIsAProblemErrorMessageHeader,
    message: noticeDateWhenNotProvided.theDateYouReceiveNoticeErrorMessage,
  });
  await performAction('inputText', noticeDateWhenNotProvided.yearTextLabel, '2000');
}
