import { uploadYourDocuments } from '../../data/page-data/documents-page-data';
import { performAction, performValidation } from '../../utils/controller';

export async function uploadYourDocumentsErrorValidation(): Promise<void> {
  await performAction('clickButton', uploadYourDocuments.continueButton);
  await performValidation('errorMessage', {
    header: uploadYourDocuments.thereIsAProblemErrorMessageHeader,
    message: uploadYourDocuments.selectAFileErrorMessage,
  });
}
