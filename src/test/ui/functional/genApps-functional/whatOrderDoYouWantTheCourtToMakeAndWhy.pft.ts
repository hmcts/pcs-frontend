import { feedback } from '../../data/page-data';
import { whatOrderDoYouWantTheCourtToMakeAndWhy } from '../../data/page-data/genApps-page-data';
import { performAction, performValidation } from '../../utils/controller';

export async function whatOrderDoYouWantTheCourtToMakeAndWhyErrorValidation(): Promise<void> {
  await performAction('inputErrorValidationGenApp', {
    validationType: whatOrderDoYouWantTheCourtToMakeAndWhy.errorValidationType.two,
    inputArray: whatOrderDoYouWantTheCourtToMakeAndWhy.errorValidationField.errorTextField,
    header: whatOrderDoYouWantTheCourtToMakeAndWhy.thereIsAProblemErrorMessageHeader,
    label: whatOrderDoYouWantTheCourtToMakeAndWhy.explainWhatYouWantTextLabel,
    button: whatOrderDoYouWantTheCourtToMakeAndWhy.continueButton,
  });
}

export async function whatOrderDoYouWantTheCourtToMakeAndWhyNavigationTests(): Promise<void> {
  await performValidation('pageNavigation', whatOrderDoYouWantTheCourtToMakeAndWhy.feedbackLink, {
    element: feedback.tellUsWhatYouThinkParagraph,
    pageSlug: whatOrderDoYouWantTheCourtToMakeAndWhy.pageSlug,
  });
}
