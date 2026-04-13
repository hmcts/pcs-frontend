import { dashboard, feedback } from '../../data/page-data';
import { askTheCourtToMakeAnOrder, chooseAnApplication } from '../../data/page-data/genApps-page-data';
import { performValidation } from '../../utils/controller';

export async function askTheCourtToMakeAnOrderNavigationTests(): Promise<void> {
  await performValidation('pageNavigation', askTheCourtToMakeAnOrder.feedbackLink, {
    element: feedback.tellUsWhatYouThinkParagraph,
    pageSlug: askTheCourtToMakeAnOrder.pageSlug,
  });
  await performValidation('pageNavigation', askTheCourtToMakeAnOrder.backLink, chooseAnApplication.mainHeader);
  await performValidation('pageNavigation', chooseAnApplication.cancelLink, dashboard.mainHeader);
}
