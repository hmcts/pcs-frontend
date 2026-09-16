import {
  nonRentArrearsDispute,
} from '../../data/page-data/lr-page-data';
import { generateRandomString } from '../../utils/common/string.utils';
import { performAction, performValidation } from '../../utils/controller';

const charLimitInputText = generateRandomString(6501);
export async function nonRentArrearsDisputeErrorValidation(): Promise<void> {
  //mandatory radio button selection
  await performAction('clickButton', nonRentArrearsDispute.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: nonRentArrearsDispute.thereIsAProblemErrorMessageHeader,
    message: nonRentArrearsDispute.selectIfYouWantToDisputeErrorMessage,
  });
  //mandatory input field validation for 'Yes' radio button selection
  await performAction('clickRadioButton', nonRentArrearsDispute.yesRadioOption);
  await performAction('clickButton', nonRentArrearsDispute.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: nonRentArrearsDispute.thereIsAProblemErrorMessageHeader,
    message: nonRentArrearsDispute.partsOfClaimDoNotAgreeErrorMessage,
  });
  //commented due to bug HDPI-7442
  // await performAction(
  //   'clickLinkAndVerifyNewTabTitle',
  //   nonRentArrearsDispute.viewTheClaimLink,
  //   nonRentArrearsDispute.titleGovServiceHiddenNewTab
  // );
  await performAction(
    'inputText',
    nonRentArrearsDispute.explainPartOfClaimHiddenTextLabel,
    nonRentArrearsDispute.explainClaimTextInput
  );
  // emoji
  await performAction('clickRadioButton', nonRentArrearsDispute.yesRadioOption);
  await performAction(
    'inputText',
    nonRentArrearsDispute.explainPartOfClaimHiddenTextLabel,
    nonRentArrearsDispute.emojiTextInput
  );
  await performAction('clickButton', nonRentArrearsDispute.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: nonRentArrearsDispute.thereIsAProblemErrorMessageHeader,
    message: nonRentArrearsDispute.emojiExplainPartsOfClaimErrorMessage,
  });

  // Char limit
  await performAction('clickRadioButton', nonRentArrearsDispute.yesRadioOption);
  await performAction('inputText', nonRentArrearsDispute.explainPartOfClaimHiddenTextLabel, charLimitInputText);
  await performAction('clickButton', nonRentArrearsDispute.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: nonRentArrearsDispute.thereIsAProblemErrorMessageHeader,
    message: nonRentArrearsDispute.charLimitErrorMessage,
  });
}
