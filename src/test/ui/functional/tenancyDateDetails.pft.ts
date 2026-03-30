import { dashboard, feedback, tenancyDateDetails, tenancyTypeDetails } from '../data/page-data';
import { performAction, performActions, performValidation } from '../utils/controller';

export async function tenancyDateDetailsErrorValidation(): Promise<void> {
  await performAction('clickButton', tenancyDateDetails.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: tenancyDateDetails.errorValidationHeader,
    message: tenancyDateDetails.selectIfTheseTenancyDetailsAreCorrectErrorMessage,
  });
  await performAction('selectTenancyStartDateKnown', {
    option: tenancyDateDetails.noRadioOption,
    day: '24',
    month: '13',
    year: '2025',
  });
  await performValidation('errorMessage', {
    header: tenancyDateDetails.errorValidationHeader,
    message: tenancyDateDetails.realDateErrorMessage,
  });
  await performActions(
    'Enter Date',
    ['inputText', tenancyDateDetails.dayHiddenTextLabel, ''],
    ['inputText', tenancyDateDetails.monthHiddenTextLabel, '12']
  );
  await performAction('clickButton', tenancyDateDetails.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: tenancyDateDetails.errorValidationHeader,
    message: tenancyDateDetails.dayMissingErrorMessage,
  });
  await performActions(
    'Enter Date',
    ['inputText', tenancyDateDetails.dayHiddenTextLabel, '12'],
    ['inputText', tenancyDateDetails.monthHiddenTextLabel, '']
  );
  await performAction('clickButton', tenancyDateDetails.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: tenancyDateDetails.errorValidationHeader,
    message: tenancyDateDetails.monthMissingErrorMessage,
  });
  await performActions(
    'Enter Date',
    ['inputText', tenancyDateDetails.monthHiddenTextLabel, '12'],
    ['inputText', tenancyDateDetails.yearHiddenTextLabel, '']
  );
  await performAction('clickButton', tenancyDateDetails.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: tenancyDateDetails.errorValidationHeader,
    message: tenancyDateDetails.yearMissingErrorMessage,
  });
}

export async function tenancyDateDetailsNavigationTests(): Promise<void> {
  await performValidation('pageNavigation', tenancyDateDetails.feedbackLink, {
    element: feedback.tellUsWhatYouThinkParagraph,
    pageSlug: tenancyDateDetails.pageSlug,
  });
  await performValidation('pageNavigation', tenancyDateDetails.backLink, tenancyTypeDetails.mainHeader);
  await performAction('clickRadioButton', tenancyDateDetails.yesRadioOption);
  await performValidation('pageNavigation', tenancyDateDetails.saveForLaterButton, dashboard.mainHeader);
}
