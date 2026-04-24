import {
  confirmationOfNoticeDateWhenNotProvided,
  confirmationOfNoticeGiven,
  dashboard,
  feedback,
} from '../data/page-data';
import { performAction, performValidation } from '../utils/controller';

export async function confirmationOfNoticeDateWhenNotProvidedErrorValidation(): Promise<void> {
  await performAction('enterNoticeDateKnown', {
    day: '25',
    month: '2',
    year: '2050',
  });
  await performValidation('errorMessage', {
    header: confirmationOfNoticeDateWhenNotProvided.thereIsAProblemErrorMessageHeader,
    message: confirmationOfNoticeDateWhenNotProvided.theDateYouReceiveNoticeErrorMessage,
  });
  await performAction('inputText', confirmationOfNoticeDateWhenNotProvided.yearTextLabel, '2000');
}

export async function confirmationOfNoticeDateWhenNotProvidedNavigationTests(): Promise<void> {
  await performValidation('pageNavigation', confirmationOfNoticeDateWhenNotProvided.feedbackLink, {
    element: feedback.tellUsWhatYouThinkParagraph,
    pageSlug: confirmationOfNoticeDateWhenNotProvided.pageSlug,
  });
  await performValidation(
    'pageNavigation',
    confirmationOfNoticeDateWhenNotProvided.backLink,
    confirmationOfNoticeGiven.mainHeader
  );
  await performValidation(
    'pageNavigation',
    confirmationOfNoticeDateWhenNotProvided.saveForLaterButton,
    dashboard.mainHeader
  );
}
