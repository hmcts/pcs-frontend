import { confirmIfTheseDocumentsRelateToAnApplication } from '../../data/page-data/documents-page-data';
import { performAction, performValidation } from '../../utils/controller';

export async function confirmDocumentsRelateToApplicationErrorValidation(): Promise<void> {
  await performAction('clickButton', confirmIfTheseDocumentsRelateToAnApplication.continueButton);
  await performValidation('errorMessage', {
    header: confirmIfTheseDocumentsRelateToAnApplication.thereIsAProblemErrorMessageHeader,
    message: confirmIfTheseDocumentsRelateToAnApplication.confirmIfTheseErrorMessage,
  });
}