import { nonRentArrearsDispute } from '../data/page-data';
import { performAction, performValidation } from '../utils/controller';

export async function nonRentArrearsDisputeErrorValidation(): Promise<void> {
  //mandatory radio button selection
  await performAction('clickButton', nonRentArrearsDispute.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: nonRentArrearsDispute.thereIsAProblemErrorMessageHeader,
    message: nonRentArrearsDispute.selectIfYouWantToDisputeErrorMessage,
  });
  await performAction('clickRadioButton', nonRentArrearsDispute.yesRadioOption);
  //hidden hint text for input field validation
  await performValidation('elementToBeVisible', nonRentArrearsDispute.youHave6500CharactersHiddenHintText);
  //mandatory input field validation for 'Yes' radio button selection
  await performAction('clickButton', nonRentArrearsDispute.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: nonRentArrearsDispute.thereIsAProblemErrorMessageHeader,
    message: nonRentArrearsDispute.partsOfClaimDoNotAgreeErrorMessage,
  });
  //character limit error validation
  await performAction(
    'inputText',
    nonRentArrearsDispute.explainPartOfClaimHiddenTextLabel,
    nonRentArrearsDispute.detailsCharLimitInputText
  );
  await performValidation('elementToBeVisible', nonRentArrearsDispute.tooManyCharacterHiddenHintText);
  //link opening in new tab validation
  await performAction(
    'clickLinkAndVerifyNewTabTitle',
    nonRentArrearsDispute.viewTheClaimLink,
    nonRentArrearsDispute.mainHeaderGovServiceHiddenNewTab
  );
  await performAction(
    'inputText',
    nonRentArrearsDispute.explainPartOfClaimHiddenTextLabel,
    nonRentArrearsDispute.explainClaimTextInput
  );
}
