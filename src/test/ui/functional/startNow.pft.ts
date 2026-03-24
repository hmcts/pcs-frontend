import { dashboard, startNow } from '../data/page-data';
import { performValidation } from '../utils/controller';

export async function startNowNavigationTests(): Promise<void> {
  await performValidation('pageNavigation', startNow.feedbackLink, {
    element: startNow.feedbackParagraph,
    pageSlug: startNow.pageSlug,
  });
  await performValidation('pageNavigation', startNow.backLink, dashboard.mainHeader);
}
