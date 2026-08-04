import { feedback } from '../../data/page-data';
import { chooseAnApplication } from '../../data/page-data/genApps-page-data';
import { performAction, performValidation } from '../../utils/controller';

export async function chooseAnApplicationErrorValidation(): Promise<void> {
  await performAction('inputErrorValidationGenApp', {
    validationType: chooseAnApplication.errorValidationType.one,
    inputArray: chooseAnApplication.errorValidationField.errorRadioOption,
    header: chooseAnApplication.thereIsAProblemErrorMessageHeader,
    question: chooseAnApplication.whatDoYouWantToApplyForQuestion,
    option: chooseAnApplication.adjournTheHearingRadioOption,
    button: chooseAnApplication.continueButton,
  });
}

export async function chooseAnApplicationNavigationTests(): Promise<void> {
  await performValidation('pageNavigation', chooseAnApplication.feedbackLink, {
    element: feedback.tellUsWhatYouThinkParagraph,
    pageSlug: chooseAnApplication.pageSlug,
  });
}
