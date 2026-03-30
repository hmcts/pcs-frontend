import { confirmationOfNoticeGiven, dashboard, feedback, noticeDateWhenNotProvided } from '../data/page-data';
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
  await performAction('inputText', noticeDateWhenNotProvided.yearTextLabel, '2000');
}

export async function noticeDateWhenNotProvidedNavigationTests(): Promise<void> {
  await performValidation('pageNavigation', noticeDateWhenNotProvided.feedbackLink, {
    element: feedback.tellUsWhatYouThinkParagraph,
    pageSlug: noticeDateWhenNotProvided.pageSlug,
  });
  await performValidation('pageNavigation', noticeDateWhenNotProvided.backLink, confirmationOfNoticeGiven.mainHeader);
  await performValidation('pageNavigation', noticeDateWhenNotProvided.saveForLaterButton, dashboard.mainHeader);
}
