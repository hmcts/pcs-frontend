import { feedback, reasonableAdjustmentsTriage, taskList } from '../data/page-data';
import { performValidation } from '../utils/controller';

export async function reasonableAdjustmentsTriageNavigationTests(): Promise<void> {
  await performValidation('pageNavigation', reasonableAdjustmentsTriage.feedbackLink, {
    element: feedback.tellUsWhatYouThinkParagraph,
    pageSlug: reasonableAdjustmentsTriage.pageSlug,
  });
  await performValidation('pageNavigation', reasonableAdjustmentsTriage.backLink, taskList.mainHeader);
}
