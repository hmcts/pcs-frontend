import { dashboard, disputeClaimInterstitial, tenancyTypeDetails } from '../data/page-data';
import { claimantsName } from '../utils/actions/custom-actions';
import { performAction, performValidation } from '../utils/controller';

export async function tenancyTypeDetailsNotProvidedErrorValidation(): Promise<void> {
  await performAction('clickButton', tenancyTypeDetails.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: tenancyTypeDetails.thereIsAProblemErrorMessageHeader,
    message: tenancyTypeDetails.selectIfTenancyDetailsErrorMessage,
  });
  await performAction('clickRadioButton', tenancyTypeDetails.noRadioOption);
  await performAction('clickButton', tenancyTypeDetails.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: tenancyTypeDetails.thereIsAProblemErrorMessageHeader,
    message: tenancyTypeDetails.enterCorrectTenancyDetailsErrorMessage,
  });
}

export async function tenancyTypeDetailsNavigationTests(): Promise<void> {
  await performValidation(
    'pageNavigation',
    tenancyTypeDetails.backLink,
    disputeClaimInterstitial.getMainHeader(claimantsName)
  );
  await performValidation('pageNavigation', tenancyTypeDetails.saveForLaterButton, dashboard.mainHeader);
}
