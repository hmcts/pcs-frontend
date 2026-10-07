import { correspondenceAddress } from '../../data/page-data/lr-page-data';
import { performAction, performValidation } from '../../utils/controller';

export async function correspondenceAddressErrorValidation(): Promise<void> {
  await performAction('When the user clicks the button', correspondenceAddress.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: correspondenceAddress.thereIsAProblemErrorMessageHeader,
    message: correspondenceAddress.pleaseConfirmDefendantAddressErrorMessage,
  });
  await performAction('clickRadioButton', correspondenceAddress.noRadioOption);
  await performAction('When the user clicks the button', correspondenceAddress.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: correspondenceAddress.thereIsAProblemErrorMessageHeader,
    message: correspondenceAddress.enterAddressLine1ErrorMessage,
  });
  await performValidation('errorMessage', {
    header: correspondenceAddress.thereIsAProblemErrorMessageHeader,
    message: correspondenceAddress.enterTownOrCityErrorMessage,
  });
  await performValidation('errorMessage', {
    header: correspondenceAddress.thereIsAProblemErrorMessageHeader,
    message: correspondenceAddress.enterValidUkPostcodeErrorMessage,
  });
}
