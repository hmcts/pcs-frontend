import {
  dashboard,
  nonRentArrearsDispute,
  //feedback,
  yourHouseholdAndCircumstances,
} from '../data/page-data';
import { performValidation } from '../utils/controller';

export async function yourHouseholdAndCircumstancesNavigationTests(): Promise<void> {
  await performValidation('pageNavigation', yourHouseholdAndCircumstances.feedbackLink, {
    // element: feedback.tellUsWhatYouThinkParagraph,
    pageSlug: yourHouseholdAndCircumstances.pageSlug,
  });
  await performValidation('pageNavigation', yourHouseholdAndCircumstances.backLink, nonRentArrearsDispute.mainHeader);
  await performValidation('pageNavigation', yourHouseholdAndCircumstances.cancelLink, dashboard.mainHeader);
}
