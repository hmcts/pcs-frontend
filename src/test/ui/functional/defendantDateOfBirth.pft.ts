import { dashboard, defendantDateOfBirth, feedback } from '../data/page-data';
import { performAction, performValidation } from '../utils/controller';

/** Partial date (month + year only) to assert missing-part error; journey then supplies full DOB. */
export async function defendantDateOfBirthErrorValidation(): Promise<void> {
  await performAction('inputText', defendantDateOfBirth.monthTextLabel, '6');
  await performAction('inputText', defendantDateOfBirth.yearTextLabel, '1990');
  await performAction('clickButton', defendantDateOfBirth.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: defendantDateOfBirth.thereIsAProblemErrorMessageHeader,
    message: defendantDateOfBirth.yourDateOfBirthMustIncludeDayErrorMessage,
  });
}

export async function defendantDateOfBirthNavigationTests(): Promise<void> {
  await performValidation('pageNavigation', defendantDateOfBirth.feedbackLink, {
    element: feedback.tellUsWhatYouThinkParagraph,
    pageSlug: defendantDateOfBirth.pageSlug,
  });
  //This has to be fixed as it depends on the test case journey HDPI-5786
  // await performValidation('pageNavigation', defendantDateOfBirth.backLink, defendantNameCapture.mainHeader);
  await performValidation('pageNavigation', defendantDateOfBirth.saveForLaterButton, dashboard.mainHeader);
}
