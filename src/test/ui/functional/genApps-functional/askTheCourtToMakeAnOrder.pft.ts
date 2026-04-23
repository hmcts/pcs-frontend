import { feedback } from '../../data/page-data';
import { askTheCourtToMakeAnOrder } from '../../data/page-data/genApps-page-data';
import { performValidation } from '../../utils/controller';

export async function askTheCourtToMakeAnOrderNavigationTests(): Promise<void> {
  await performValidation('pageNavigation', askTheCourtToMakeAnOrder.feedbackLink, {
    element: feedback.tellUsWhatYouThinkParagraph,
    pageSlug: askTheCourtToMakeAnOrder.pageSlug,
  });
}
