import { instalmentPayments } from '../../data/page-data/lr-page-data';
import { performAction, performValidation } from '../../utils/controller';

export async function instalmentPaymentsErrorValidation(): Promise<void> {
  await performAction('clickButton', instalmentPayments.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: instalmentPayments.thereIsAProblemErrorMessageHeader,
    message: instalmentPayments.selectWhetherDefendantWouldLikeToOfferErrorMessage,
  });
}
