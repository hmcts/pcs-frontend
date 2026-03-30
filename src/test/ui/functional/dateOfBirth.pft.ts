import { dashboard, dateOfBirth, defendantNameCapture, feedback } from '../data/page-data';
import { performValidation } from '../utils/controller';

export async function dateOfBirthNavigationTests(): Promise<void> {
  await performValidation('pageNavigation', dateOfBirth.feedbackLink, {
    element: feedback.tellUsWhatYouThinkParagraph,
    pageSlug: dateOfBirth.pageSlug,
  });
  await performValidation('pageNavigation', dateOfBirth.backLink, defendantNameCapture.mainHeader);
  await performValidation('pageNavigation', dateOfBirth.saveForLaterButton, dashboard.mainHeader);
}
