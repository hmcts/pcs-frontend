import { dashboard, defendantDateOfBirth, feedback } from '../data/page-data';
import { performValidation } from '../utils/controller';

export async function defendantDateOfBirthNavigationTests(): Promise<void> {
  await performValidation('pageNavigation', defendantDateOfBirth.feedbackLink, {
    element: feedback.tellUsWhatYouThinkParagraph,
    pageSlug: defendantDateOfBirth.pageSlug,
  });
  //This has to be fixed as it depends on the test case journey HDPI-5786
  // await performValidation('pageNavigation', defendantDateOfBirth.backLink, defendantNameCapture.mainHeader);
  await performValidation('pageNavigation', defendantDateOfBirth.saveForLaterButton, dashboard.mainHeader);
}
