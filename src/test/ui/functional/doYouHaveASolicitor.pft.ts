import { dashboard, doYouHaveASolicitor, feedback, freeLegalAdvice, startNow } from '../data/page-data';
import { performAction, performValidation } from '../utils/controller';

export async function doYouHaveASolicitorErrorValidation(): Promise<void> {
  await performAction('clickButton', doYouHaveASolicitor.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: doYouHaveASolicitor.thereIsAProblemErrorMessageHeader,
    message: doYouHaveASolicitor.doYouHaveASolicitorErrorValidation,
  });
}

