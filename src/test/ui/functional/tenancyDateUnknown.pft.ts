import { dashboard, tenancyDateUnknown, tenancyTypeDetails } from '../data/page-data';
import { performAction, performActions, performValidation } from '../utils/controller';

export async function tenancyDateUnknownErrorValidation(): Promise<void> {
  //This error message will trigger if no day is provided
  await performAction('inputText', tenancyDateUnknown.monthTextLabel, '11');
  await performAction('inputText', tenancyDateUnknown.yearTextLabel, '2022');
  await performAction('clickButton', tenancyDateUnknown.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: tenancyDateUnknown.thereIsAProblemErrorMessageHeader,
    message: tenancyDateUnknown.dayMissingErrorMessage,
  });

  //This error message will trigger if no month value is provided
  await performAction('inputText', tenancyDateUnknown.dayTextLabel, '12');
  await performAction('inputText', tenancyDateUnknown.monthTextLabel, '');
  await performAction('clickButton', tenancyDateUnknown.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: tenancyDateUnknown.thereIsAProblemErrorMessageHeader,
    message: tenancyDateUnknown.monthMissingErrorMessage,
  });

  //This error message will trigger if no year value is provided
  await performAction('inputText', tenancyDateUnknown.monthTextLabel, '11');
  await performAction('inputText', tenancyDateUnknown.yearTextLabel, '');
  await performAction('clickButton', tenancyDateUnknown.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: tenancyDateUnknown.thereIsAProblemErrorMessageHeader,
    message: tenancyDateUnknown.yearMissingErrorMessage,
  });

  //This error message will trigger if invalid date is provided
  await performAction('inputText', tenancyDateUnknown.dayTextLabel, '32');
  await performAction('inputText', tenancyDateUnknown.yearTextLabel, '2025');
  await performAction('clickButton', tenancyDateUnknown.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: tenancyDateUnknown.thereIsAProblemErrorMessageHeader,
    message: tenancyDateUnknown.realDateErrorMessage,
  });
}

export async function tenancyDateUnknownNavigationTests(): Promise<void> {
  await performValidation('pageNavigation', tenancyDateUnknown.backLink, tenancyTypeDetails.mainHeader);
  await performActions(
    'Enter Date',
    ['inputText', tenancyDateUnknown.dayTextLabel, '21'],
    ['inputText', tenancyDateUnknown.monthTextLabel, '09'],
    ['inputText', tenancyDateUnknown.yearTextLabel, '2025']
  );
  await performValidation('pageNavigation', tenancyDateUnknown.saveForLaterButton, dashboard.mainHeader);
}
