import { confirmationOfNoticeGiven, noticeDateWhenNotProvided } from '../data/page-data';
import { performAction, performValidation } from '../utils/controller';

export async function noticeDateWhenNotProvidedErrorValidation(): Promise<void> {
  await performAction('enterNoticeDateKnown', {
    day: '25',
    month: '2',
    year: '2050',
  });
  await performValidation('errorMessage', {
    header: noticeDateWhenNotProvided.thereIsAProblemErrorMessageHeader,
    message: noticeDateWhenNotProvided.theDateYouReceiveNoticeErrorMessage,
  });
}

export async function noticeDateWhenNotProvidedNavigationTests(): Promise<void> {
  await performValidation('pageNavigation', noticeDateWhenNotProvided.backLink, confirmationOfNoticeGiven.mainHeader);
  await performValidation('pageNavigation', noticeDateWhenNotProvided.saveForLaterButton, 'Dashboard');
}
