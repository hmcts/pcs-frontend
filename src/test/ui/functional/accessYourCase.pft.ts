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
  await performAction('inputText', accessYourCase.enterYourClaimNumberLabel, '1234-5678-ABCD-1234');
  await performAction('inputText', accessYourCase.enterYourAccessCodeLabel, 'validcode123');

  await performAction('clickButton', accessYourCase.continueButton);
  await performValidation('errorMessage', {
    header: accessYourCase.thereIsAProblemErrorMessageHeader,
    message: accessYourCase.claimNumberMustOnlyIncludeNumbersErrorMessage,
  });

  // Test 3: Claim number - incorrect length (too short - <16)
  await performAction('inputText', accessYourCase.enterYourClaimNumberLabel, '1234-5678-123');
  await performAction('clickButton', accessYourCase.continueButton);
  await performValidation('errorMessage', {
    header: accessYourCase.thereIsAProblemErrorMessageHeader,
    message: accessYourCase.claimNumberMustBeBetween16And20CharactersErrorMessage,
  });

  // Test 4: Claim number - incorrect length (too long - >20)
  await performAction('inputText', accessYourCase.enterYourClaimNumberLabel, '1234-5678-9012-3456-7890');
  await performAction('clickButton', accessYourCase.continueButton);
  await performValidation('errorMessage', {
    header: accessYourCase.thereIsAProblemErrorMessageHeader,
    message: accessYourCase.claimNumberMustBeBetween16And20CharactersErrorMessage,
  });

  // Test 5: Access code - incorrect format (contains special characters)
  await performAction('inputText', accessYourCase.enterYourClaimNumberLabel, '1234-5678-9012-1234');
  await performAction('inputText', accessYourCase.enterYourAccessCodeLabel, 'invalid@code!');
  await performAction('clickButton', accessYourCase.continueButton);
  await performValidation('errorMessage', {
    header: accessYourCase.thereIsAProblemErrorMessageHeader,
    message: accessYourCase.accessCodeMustOnlyIncludeLettersAndNumbersErrorMessage,
  });

  // Test 6: Access code - incorrect length (too short - <12)
  await performAction('inputText', accessYourCase.enterYourAccessCodeLabel, 'short123');
  await performAction('clickButton', accessYourCase.continueButton);
  await performValidation('errorMessage', {
    header: accessYourCase.thereIsAProblemErrorMessageHeader,
    message: accessYourCase.accessCodeMustBe12CharactersErrorMessage,
  });

  // Test 7: Access code - incorrect length (too long - >12)
  await performAction('inputText', accessYourCase.enterYourAccessCodeLabel, 'toolongcode123456');
  await performAction('clickButton', accessYourCase.continueButton);
  await performValidation('errorMessage', {
    header: accessYourCase.thereIsAProblemErrorMessageHeader,
    message: accessYourCase.accessCodeMustBe12CharactersErrorMessage,
  });
}
