import { tenancyDetails, tenancyStartDateKnown } from '../data/page-data';
import { performAction, performActions, performValidation } from '../utils/controller';

export async function tenancyStartDateKnownErrorValidation(): Promise<void> {
  await performAction('clickButton', tenancyStartDateKnown.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: tenancyStartDateKnown.errorValidationHeader,
    message: tenancyStartDateKnown.selectIfTheseTenancyDetailsAreCorrectErrorMessage,
  });
  await performAction('selectTenancyStartDateKnown', {
    option: tenancyStartDateKnown.noRadioOption,
    day: '24',
    month: '13',
    year: '2025',
  });
  await performValidation('errorMessage', {
    header: tenancyStartDateKnown.errorValidationHeader,
    message: tenancyStartDateKnown.RealDateErrorMessage,
  });
  await performActions(
    'Enter Date',
    ['inputText', tenancyStartDateKnown.dayHiddenTextLabel, ''],
    ['inputText', tenancyStartDateKnown.monthHiddenTextLabel, '12']
  );
  await performAction('clickButton', tenancyStartDateKnown.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: tenancyStartDateKnown.errorValidationHeader,
    message: tenancyStartDateKnown.DayMissingErrorMessage,
  });
  await performActions(
    'Enter Date',
    ['inputText', tenancyStartDateKnown.dayHiddenTextLabel, '12'],
    ['inputText', tenancyStartDateKnown.monthHiddenTextLabel, '']
  );
  await performAction('clickButton', tenancyStartDateKnown.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: tenancyStartDateKnown.errorValidationHeader,
    message: tenancyStartDateKnown.MonthMissingErrorMessage,
  });
  await performActions(
    'Enter Date',
    ['inputText', tenancyStartDateKnown.monthHiddenTextLabel, '12'],
    ['inputText', tenancyStartDateKnown.yearHiddenTextLabel, '']
  );
  await performAction('clickButton', tenancyStartDateKnown.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: tenancyStartDateKnown.errorValidationHeader,
    message: tenancyStartDateKnown.YearMissingErrorMessage,
  });
}

export async function tenancyStartDateKnownNavigationTests(): Promise<void> {
  await performValidation('pageNavigation', tenancyStartDateKnown.backLink, tenancyDetails.mainHeader);
  await performAction('clickRadioButton', tenancyStartDateKnown.yesRadioOption);
  await performValidation('pageNavigation', tenancyStartDateKnown.saveForLaterButton, 'Dashboard');
}
