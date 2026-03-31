import { dashboard, feedback, startNow } from '../data/page-data';
import { performValidation } from '../utils/controller';

export async function startNowNavigationTests(): Promise<void> {
  await performValidation('pageNavigation', startNow.feedbackLink, {
    element: feedback.tellUsWhatYouThinkParagraph,
    pageSlug: startNow.pageSlug,
  });
  await performValidation('pageNavigation', startNow.backLink, dashboard.mainHeader);
}
