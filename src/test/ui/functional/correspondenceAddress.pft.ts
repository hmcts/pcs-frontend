import { correspondenceAddress, dashboard, dateOfBirth } from '../data/page-data';
import { performAction, performValidation, performValidations } from '../utils/controller';

export async function correspondenceAddressErrorValidation(): Promise<void> {
  await performAction('clickButton', correspondenceAddress.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: correspondenceAddress.thereIsAProblemErrorMessageHeader,
    message: correspondenceAddress.pleaseConfirmYourAddressErrorMessage,
  });
  await performAction('clickRadioButton', correspondenceAddress.noRadioOption);
  await performAction('clickButton', correspondenceAddress.findAddressHiddenButton);
  await performValidation('errorMessage', {
    header: correspondenceAddress.thereIsAProblemErrorMessageHeader,
    message: correspondenceAddress.enterValidPostcodeErrorMessage,
  });

  await performAction('inputText', correspondenceAddress.enterUKPostcodeHiddenTextLabel, '12345');
  await performAction('clickButton', correspondenceAddress.findAddressHiddenButton);
  await performValidation('errorMessage', {
    header: correspondenceAddress.thereIsAProblemErrorMessageHeader,
    message: correspondenceAddress.postCodeNotFoundErrorMessage,
  });

  await performAction(
    'inputText',
    correspondenceAddress.enterUKPostcodeHiddenTextLabel,
    correspondenceAddress.englandPostcodeTextInput
  );
  await performAction('clickButton', correspondenceAddress.findAddressHiddenButton);
  await performAction('clickButton', correspondenceAddress.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: correspondenceAddress.thereIsAProblemErrorMessageHeader,
    message: correspondenceAddress.pleaseSelectAnAddressErrorMessage,
  });

  await performAction('select', correspondenceAddress.addressSelectHiddenLabel, correspondenceAddress.addressIndex);
  await performAction('inputText', correspondenceAddress.addressLine1HiddenTextLabel, '');
  await performAction('inputText', correspondenceAddress.townOrCityHiddenTextLabel, '');
  await performAction('inputText', correspondenceAddress.postcodeHiddenTextLabel, '');
  await performAction('clickButton', correspondenceAddress.saveAndContinueButton);
  await performValidations(
    'Address related error messages',
    [
      'errorMessage',
      {
        header: correspondenceAddress.thereIsAProblemErrorMessageHeader,
        message: correspondenceAddress.enterAddressLine1ErrorMessage,
      },
    ],
    [
      'errorMessage',
      {
        header: correspondenceAddress.thereIsAProblemErrorMessageHeader,
        message: correspondenceAddress.enterTownOrCityErrorMessage,
      },
    ],
    [
      'errorMessage',
      {
        header: correspondenceAddress.thereIsAProblemErrorMessageHeader,
        message: correspondenceAddress.enterValidPostcodeErrorMessage,
      },
    ]
  );

  await performAction(
    'inputText',
    correspondenceAddress.addressLine1HiddenTextLabel,
    correspondenceAddress.englandAddressLine1TextInput
  );
  await performAction(
    'inputText',
    correspondenceAddress.townOrCityHiddenTextLabel,
    correspondenceAddress.englandTownOrCityTextInput
  );
  await performAction('inputText', correspondenceAddress.postcodeHiddenTextLabel, 'ABED');
  await performAction('clickButton', correspondenceAddress.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: correspondenceAddress.thereIsAProblemErrorMessageHeader,
    message: correspondenceAddress.enterValidPostcodeErrorMessage,
  });
}

export async function correspondenceAddressNavigationTests(): Promise<void> {
  await performValidation('pageNavigation', correspondenceAddress.backLink, dateOfBirth.mainHeader);
  await performAction('clickRadioButton', correspondenceAddress.yesRadioOption);
  await performValidation('pageNavigation', correspondenceAddress.saveForLaterButton, dashboard.mainHeader);
}
