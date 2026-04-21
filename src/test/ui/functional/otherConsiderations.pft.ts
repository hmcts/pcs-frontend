import { otherConsiderations, whatOtherRegularExpensesDoYouHave } from '../data/page-data';
import { performAction, performValidation } from '../utils/controller';

export async function otherConsiderationsErrorValidation(): Promise<void> {
  await performAction('clickButton', otherConsiderations.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: otherConsiderations.thereIsAProblemErrorMessageHeader,
    message: otherConsiderations.selectIfThereIsAnythingElseYouWantToTellTheCourtErrorMessage,
  });

  await performAction('clickRadioButton', otherConsiderations.yesRadioOption);
  await performAction('clickButton', otherConsiderations.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: otherConsiderations.thereIsAProblemErrorMessageHeader,
    message: otherConsiderations.giveDetailsAboutWhatYouWantToTellTheCourtErrorMessage,
  });
}

export async function otherConsiderationsNavigationTests(): Promise<void> {
  await performValidation('pageNavigation', otherConsiderations.backLink, whatOtherRegularExpensesDoYouHave.mainHeader);
}
