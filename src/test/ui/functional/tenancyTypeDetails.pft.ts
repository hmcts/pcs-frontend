import { dashboard, disputeClaimInterstitial, tenancyTypeDetails, writtenTerms } from '../data/page-data';
import { claimantsName } from '../utils/actions/custom-actions';
import { performAction, performValidation } from '../utils/controller';
import type { EmvStepReportDetail } from '../validationTests/emvReport.types';

export function tenancyTypeDetailsErrorValidationEmvReport(): EmvStepReportDetail {
  return {
    intent: 'Tenancy type: mandatory “is this correct?” and, when No, mandatory free-text for correct type.',
    screenTitle: tenancyTypeDetails.mainHeader,
    actionsOrInputs: [
      'Save without answering whether tenancy details are correct.',
      'Select No, save again without entering correct tenancy details.',
    ],
    expectedAssertions: [
      {
        label: 'Radio required',
        summaryTitle: tenancyTypeDetails.thereIsAProblemErrorMessageHeader,
        messageContains: tenancyTypeDetails.selectIfTenancyDetailsErrorMessage,
      },
      {
        label: 'Details required when No',
        summaryTitle: tenancyTypeDetails.thereIsAProblemErrorMessageHeader,
        messageContains: tenancyTypeDetails.enterCorrectTenancyDetailsErrorMessage,
      },
    ],
  };
}

export async function tenancyTypeDetailsErrorValidation(): Promise<void> {
  //mandatory radio button selection
  await performAction('clickButton', tenancyTypeDetails.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: tenancyTypeDetails.thereIsAProblemErrorMessageHeader,
    message: tenancyTypeDetails.selectIfTenancyDetailsErrorMessage,
  });
  //mandatory text field for 'No' radio button selection
  await performAction('clickRadioButton', {
    question: tenancyTypeDetails.isTenancyTypeCorrectQuestion,
    option: tenancyTypeDetails.noRadioOption,
  });
  await performAction('clickButton', tenancyTypeDetails.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: tenancyTypeDetails.thereIsAProblemErrorMessageHeader,
    message: tenancyTypeDetails.enterCorrectTenancyDetailsErrorMessage,
  });
}

export async function tenancyTypeDetailsNavigationTests(): Promise<void> {
  if (process.env.WALES_POSTCODE === 'YES') {
    if (claimantsName) {
      await performValidation('pageNavigation', tenancyTypeDetails.backLink, writtenTerms.mainHeader);
    }
  } else {
    if (claimantsName) {
      await performValidation(
        'pageNavigation',
        tenancyTypeDetails.backLink,
        disputeClaimInterstitial.getMainHeader(claimantsName)
      );
    }
  }
  await performAction('clickRadioButton', {
    question: tenancyTypeDetails.isTenancyTypeCorrectQuestion,
    option: tenancyTypeDetails.yesRadioOption,
  });
  await performValidation('pageNavigation', tenancyTypeDetails.saveForLaterButton, dashboard.mainHeader);
}
