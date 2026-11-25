import { feedback } from '../../data/page-data';
import { chooseAnApplication } from '../../data/page-data/genApps-page-data';
import {
  DEFENDANT_GENERAL_APPLICATIONS_R2_FLAG,
  LaunchDarklyAction,
} from '../../utils/actions/custom-actions/launchDarkly.action';
import { performAction, performValidation } from '../../utils/controller';

export async function chooseAnApplicationErrorValidation(): Promise<void> {
  const isR2Enabled = await new LaunchDarklyAction().getFlagValue(DEFENDANT_GENERAL_APPLICATIONS_R2_FLAG);
  if (isR2Enabled === undefined) {
    throw new Error(
      `Cannot evaluate LaunchDarkly flag "${DEFENDANT_GENERAL_APPLICATIONS_R2_FLAG}", so it is unknown which error message to expect`
    );
  }
  await performAction('inputErrorValidationGenApp', {
    validationType: chooseAnApplication.errorValidationType.one,
    inputArray: isR2Enabled
      ? chooseAnApplication.errorValidationField.errorRadioOptionR2
      : chooseAnApplication.errorValidationField.errorRadioOption,
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
