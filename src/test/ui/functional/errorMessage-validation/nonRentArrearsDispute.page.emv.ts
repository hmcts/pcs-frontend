import { nonRentArrearsDispute } from '../../data/page-data';
import { performAction, performValidation } from '../../utils/controller';

export default async function nonRentArrearsDisputeErrorValidation(): Promise<void> {
  await performAction('clickButton', nonRentArrearsDispute.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: nonRentArrearsDispute.thereIsAProblemErrorMessageHeader,
    message: nonRentArrearsDispute.selectIfYouWantToDisputeErrorMessage,
  });
  await performAction('clickRadioButton', nonRentArrearsDispute.yesRadioOption);
  await performValidation('elementToBeVisible', nonRentArrearsDispute.youHave6500CharactersHiddenHintText);
  await performAction('clickButton', nonRentArrearsDispute.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: nonRentArrearsDispute.thereIsAProblemErrorMessageHeader,
    message: nonRentArrearsDispute.partsOfClaimDoNotAgreeErrorMessage,
  });
  await performAction(
    'inputText',
    nonRentArrearsDispute.explainPartOfClaimHiddenTextLabel,
    nonRentArrearsDispute.detailsCharLimitInputText
  );
  await performValidation('elementToBeVisible', nonRentArrearsDispute.tooManyCharacterHiddenHintText);
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
