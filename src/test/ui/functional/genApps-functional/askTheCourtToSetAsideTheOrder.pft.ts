import { feedback } from '../../data/page-data';
import { askTheCourtToSetAsideTheOrder } from '../../data/page-data/genApps-page-data';
import { performValidation } from '../../utils/controller';

export async function askTheCourtToSetAsideTheOrderNavigationTests(): Promise<void> {
  await performValidation('pageNavigation', askTheCourtToSetAsideTheOrder.feedbackLink, {
    element: feedback.tellUsWhatYouThinkParagraph,
    pageSlug: askTheCourtToSetAsideTheOrder.pageSlug,
  });
}
