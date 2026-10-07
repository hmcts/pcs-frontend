import { counterclaimDoYouWantToUploadFiles } from '../../data/page-data/lr-page-data';
import { performAction, performValidation } from '../../utils/controller';

export async function counterclaimDoYouWantToUploadFilesErrorValidation(): Promise<void> {
  await performAction('When the user clicks the button', counterclaimDoYouWantToUploadFiles.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: counterclaimDoYouWantToUploadFiles.thereIsAProblemErrorMessageHeader,
    message: counterclaimDoYouWantToUploadFiles.selectIfYouWantToUploadErrorMessage,
  });

  await performAction('clickRadioButton', counterclaimDoYouWantToUploadFiles.yesRadioOption);
}
