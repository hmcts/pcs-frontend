import { dashboard, disputeClaimInterstitial, tenancyTypeDetails } from '../data/page-data';
import { claimantsName } from '../utils/actions/custom-actions';
import { performAction, performValidation } from '../utils/controller';

export async function tenancyTypeDetailsErrorValidation(): Promise<void> {
  //mandatory radio button selection
  await performAction('clickButton', tenancyTypeDetails.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: tenancyTypeDetails.thereIsAProblemErrorMessageHeader,
    message: tenancyTypeDetails.selectIfTenancyDetailsErrorMessage,
  });
  //mandatory text field for 'No' radio button selection
  await performAction('clickRadioButton', tenancyTypeDetails.noRadioOption);
  await performAction('clickButton', tenancyTypeDetails.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: tenancyTypeDetails.thereIsAProblemErrorMessageHeader,
    message: tenancyTypeDetails.enterCorrectTenancyDetailsErrorMessage,
  });
}

export async function tenancyTypeDetailsNavigationTests(): Promise<void> {
  if (claimantsName) {
    await performValidation(
      'pageNavigation',
      tenancyTypeDetails.backLink,
      disputeClaimInterstitial.getMainHeader(claimantsName)
    );
  }
  await performAction('clickRadioButton', tenancyTypeDetails.yesRadioOption);
  await performValidation('pageNavigation', tenancyTypeDetails.saveForLaterButton, dashboard.mainHeader);
}
