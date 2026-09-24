import { repaymentsMade } from '../../data/page-data/lr-page-data';
import { performAction, performValidation } from '../../utils/controller';

export async function repaymentsMadeErrorValidation(): Promise<void> {
  await performAction('clickButton', repaymentsMade.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: repaymentsMade.thereIsAProblemErrorMessageHeader,
    message: repaymentsMade.getSelectIfYouPaidAnyMoneyErrorMessage(process.env.CLAIMANT_NAME as string),
  });

  await performAction('clickRadioButton', repaymentsMade.yesRadioOption);
  await performAction('clickButton', repaymentsMade.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: repaymentsMade.thereIsAProblemErrorMessageHeader,
    message: repaymentsMade.giveDetailsAboutHowMuchYouPaidErrorMessage,
  });

  await performAction('clickRadioButton', repaymentsMade.yesRadioOption);
  await performAction('inputText', repaymentsMade.giveDetailsHiddenTextLabel, repaymentsMade.detailsCharLimitInputText);
  await performAction('clickButton', repaymentsMade.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: repaymentsMade.thereIsAProblemErrorMessageHeader,
    message: repaymentsMade.mustBeUnderCharacterLimitErrorMessage,
  });
  // emoji
  await performAction('inputText', repaymentsMade.giveDetailsHiddenTextLabel, repaymentsMade.emojiTextInput);
  await performAction('clickButton', repaymentsMade.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: repaymentsMade.thereIsAProblemErrorMessageHeader,
    message: repaymentsMade.emojiErrorMessage,
  });
}
