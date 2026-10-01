import { installmentPayments } from '../../data/page-data/lr-page-data';
import { performAction, performValidation } from '../../utils/controller';

export async function installmentPaymentsErrorValidation(): Promise<void> {
  await performAction('clickButton', installmentPayments.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: installmentPayments.thereIsAProblemErrorMessageHeader,
    message: installmentPayments.selectWhetherYouWouldLikeToOfferErrorMessage,
  });
}
