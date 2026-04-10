import { dashboard, defendantDateOfBirth, defendantNameCapture, feedback } from '../data/page-data';
import { performValidation } from '../utils/controller';

export async function defendantDateOfBirthNavigationTests(): Promise<void> {
  await performValidation('pageNavigation', defendantDateOfBirth.feedbackLink, {
    element: feedback.tellUsWhatYouThinkParagraph,
    pageSlug: defendantDateOfBirth.pageSlug,
  });
  await performValidation('pageNavigation', defendantDateOfBirth.backLink, defendantNameCapture.mainHeader);
  await performValidation('pageNavigation', defendantDateOfBirth.saveForLaterButton, dashboard.mainHeader);
}
