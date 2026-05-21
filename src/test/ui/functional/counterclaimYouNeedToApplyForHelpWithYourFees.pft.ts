import {
  counterClaimHaveYouAppliedForHelp,
  counterclaimYouNeedToApplyForHelpWithYourFees,
  dashboard,
  feedback,
} from '../data/page-data';
import { performValidation } from '../utils/controller';

export async function counterclaimYouNeedToApplyForHelpWithYourFeesNavigationTests(): Promise<void> {
  await performValidation('pageNavigation', counterclaimYouNeedToApplyForHelpWithYourFees.feedbackLink, {
    element: feedback.tellUsWhatYouThinkParagraph,
    pageSlug: counterclaimYouNeedToApplyForHelpWithYourFees.pageSlug,
  });
  await performValidation(
    'pageNavigation',
    counterclaimYouNeedToApplyForHelpWithYourFees.backLink,
    counterClaimHaveYouAppliedForHelp.mainHeader
  );

  await performValidation(
    'pageNavigation',
    counterclaimYouNeedToApplyForHelpWithYourFees.saveForLaterButton,
    dashboard.mainHeader
  );
}
