import { dashboard, repaymentsAgreed, repaymentsMade } from '../data/page-data';
import { claimantsName } from '../utils/actions/custom-actions';
import { performAction, performValidation } from '../utils/controller';

export async function repaymentsAgreedErrorValidation(): Promise<void> {
  await performAction('clickButton', repaymentsAgreed.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: repaymentsAgreed.thereIsAProblemErrorMessageHeader,
    message: repaymentsAgreed.getSelectAgreementErrorMessage(claimantsName),
  });
  await performAction('clickRadioButton', repaymentsAgreed.yesRadioOption);
  await performValidation('elementToBeVisible', repaymentsAgreed.youCanEnterUpToHiddenHintText);
  await performAction(
    'inputText',
    repaymentsAgreed.giveDetailsHiddenHintText,
    repaymentsAgreed.detailsCharLimitInputText
  );
  await performValidation('elementToBeVisible', repaymentsAgreed.tooManyCharacterHiddenHintText);
}

export async function repaymentsAgreedNavigationTests(): Promise<void> {
  await performAction('clickRadioButton', repaymentsAgreed.noRadioOption);
  await performValidation('pageNavigation', repaymentsAgreed.saveForLaterButton, dashboard.mainHeader);
  await performValidation('pageNavigation', repaymentsAgreed.backLink, repaymentsMade.mainHeader);
}
