import { dashboard, dateOfBirth, defendantNameCapture } from '../data/page-data';
import { performValidation } from '../utils/controller';

export async function dateOfBirthNavigationTests(): Promise<void> {
  await performValidation('pageNavigation', dateOfBirth.backLink, defendantNameCapture.mainHeader);
  await performValidation('pageNavigation', dateOfBirth.saveForLaterButton, dashboard.mainHeader());
}
