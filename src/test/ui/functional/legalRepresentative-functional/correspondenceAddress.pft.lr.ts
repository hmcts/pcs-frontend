import { correspondenceAddress } from '../../data/page-data/lr-page-data';
import { performAction, performValidation } from '../../utils/controller';

export async function correspondenceAddressErrorValidation(): Promise<void> {
  await performAction('clickButton', correspondenceAddress.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: correspondenceAddress.thereIsAProblemErrorMessageHeader,
    message: correspondenceAddress.pleaseConfirmDefendantAddressErrorMessage,
  });
  await performAction('clickRadioButton', correspondenceAddress.noRadioOption);
  await performAction('clickButton', correspondenceAddress.saveAndContinueButton);
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
