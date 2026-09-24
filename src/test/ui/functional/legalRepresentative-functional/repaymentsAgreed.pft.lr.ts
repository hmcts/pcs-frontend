import { repaymentsAgreed } from '../../data/page-data/lr-page-data';
import { performAction, performValidation } from '../../utils/controller';

const overMaxLengthString = 'A'.repeat(501);
export async function repaymentsAgreedErrorValidation(): Promise<void> {
  await performAction('clickButton', repaymentsAgreed.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: repaymentsAgreed.thereIsAProblemErrorMessageHeader,
    message: repaymentsAgreed.getSelectAgreementErrorMessage(process.env.CLAIMANT_NAME as string),
  });
  await performAction('clickRadioButton', repaymentsAgreed.yesRadioOption);
  await performValidation('elementToBeVisible', repaymentsAgreed.youCanEnterUpToHiddenHintText);
  await performAction('inputText', repaymentsAgreed.giveDetailsHiddenTextLabel, overMaxLengthString);
  await performValidation('elementToBeVisible', repaymentsAgreed.tooManyCharacterHiddenHintText);
  await performAction('clickButton', repaymentsAgreed.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: repaymentsAgreed.thereIsAProblemErrorMessageHeader,
    message: repaymentsAgreed.mustBe500CharactersOrFewerErrorMessage,
  });
  await performAction('inputText', repaymentsAgreed.giveDetailsHiddenTextLabel, repaymentsAgreed.emojiTextInput);
  await performAction('clickButton', repaymentsAgreed.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: repaymentsAgreed.thereIsAProblemErrorMessageHeader,
    message: repaymentsAgreed.emojiErrorMessage,
  });
}
