import { accessYourCase } from '../data/page-data';
import { performAction, performValidation } from '../utils/controller';

export async function accessYourCaseErrorValidation(): Promise<void> {
  // Test 1: Empty validation - both fields empty
  await performAction('clickButton', accessYourCase.continueButton);
  await performValidation('errorMessage', {
    header: accessYourCase.thereIsAProblemErrorMessageHeader,
    message: accessYourCase.enterYourClaimNumberErrorMessage,
  });
  await performValidation('errorMessage', {
    header: accessYourCase.thereIsAProblemErrorMessageHeader,
    message: accessYourCase.enterYourAccessCodeErrorMessage,
  });

  // Test 2: Claim number - incorrect format (contains letters)
  await performAction(
    'inputText',
    accessYourCase.enterYourClaimNumberLabel,
    accessYourCase.caseNumberIncorrectFormatInput
  );
  await performAction(
    'inputText',
    accessYourCase.enterYourAccessCodeLabel,
    accessYourCase.accessCodeIncorrectFormatInput
  );

  await performAction('clickButton', accessYourCase.continueButton);
  await performValidation('errorMessage', {
    header: accessYourCase.thereIsAProblemErrorMessageHeader,
    message: accessYourCase.claimNumberMustOnlyIncludeNumbersErrorMessage,
  });

  // Test 3: Claim number - incorrect length (too short - <16)
  await performAction(
    'inputText',
    accessYourCase.enterYourClaimNumberLabel,
    accessYourCase.incorrectLengthClaimNumberInput
  );
  await performAction('clickButton', accessYourCase.continueButton);
  await performValidation('errorMessage', {
    header: accessYourCase.thereIsAProblemErrorMessageHeader,
    message: accessYourCase.claimNumberMustBeBetween16And20CharactersErrorMessage,
  });

  // Test 4: Claim number - incorrect length (too long - >20)
  await performAction(
    'inputText',
    accessYourCase.enterYourClaimNumberLabel,
    accessYourCase.incorrectLengthTooLongClaimNumberInput
  );
  await performAction('clickButton', accessYourCase.continueButton);
  await performValidation('errorMessage', {
    header: accessYourCase.thereIsAProblemErrorMessageHeader,
    message: accessYourCase.claimNumberMustBeBetween16And20CharactersErrorMessage,
  });

  // Test 5: Access code - incorrect format (contains special characters)
  await performAction(
    'inputText',
    accessYourCase.enterYourClaimNumberLabel,
    accessYourCase.caseNumberCorrectFormatInput
  );
  await performAction(
    'inputText',
    accessYourCase.enterYourAccessCodeLabel,
    accessYourCase.accessCodeIncorrectFormatSpecialCharInput
  );
  await performAction('clickButton', accessYourCase.continueButton);
  await performValidation('errorMessage', {
    header: accessYourCase.thereIsAProblemErrorMessageHeader,
    message: accessYourCase.accessCodeMustOnlyIncludeLettersAndNumbersErrorMessage,
  });

  // Test 6: Access code - incorrect length (too short - <12)
  await performAction(
    'inputText',
    accessYourCase.enterYourAccessCodeLabel,
    accessYourCase.incorrectShortAccessCodeInput
  );
  await performAction('clickButton', accessYourCase.continueButton);
  await performValidation('errorMessage', {
    header: accessYourCase.thereIsAProblemErrorMessageHeader,
    message: accessYourCase.accessCodeMustBe12CharactersErrorMessage,
  });

  // Test 7: Access code - incorrect length (too long - >12)
  await performAction(
    'inputText',
    accessYourCase.enterYourAccessCodeLabel,
    accessYourCase.incorrectLongAccessCodeInput
  );
  await performAction('clickButton', accessYourCase.continueButton);
  await performValidation('errorMessage', {
    header: accessYourCase.thereIsAProblemErrorMessageHeader,
    message: accessYourCase.accessCodeMustBe12CharactersErrorMessage,
  });
}
