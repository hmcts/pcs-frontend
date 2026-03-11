import { startNow, tenancyDateUnknown } from '../data/page-data';
import { performAction, performValidation } from '../utils/controller';

export async function tenancyDateUnknownErrorValidation(): Promise<void> {
  //This error message will trigger if no day is provided
  console.log('inside validation');
  await performAction('inputText', tenancyDateUnknown.monthTextLabel, tenancyDateUnknown.monthInputText);
  await performAction('inputText', tenancyDateUnknown.yearTextLabel, tenancyDateUnknown.yearInputText);
  await performAction('clickButton', tenancyDateUnknown.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: tenancyDateUnknown.thereIsAProblemErrorMessageHeader,
    message: tenancyDateUnknown.thereIsAProblemErrorMessageHeader,
  });
  await performValidation('errorMessage', {
    header: tenancyDateUnknown.thereIsAProblemErrorMessageHeader,
    message: tenancyDateUnknown.dayMissingErrorMessage,
  });

  //This error message will trigger if no month value is provided
  await performAction('inputText', tenancyDateUnknown.dayTextLabel, tenancyDateUnknown.dayInputText);
  await performAction('inputText', tenancyDateUnknown.yearTextLabel, tenancyDateUnknown.yearInputText);
  await performAction('clickButton', tenancyDateUnknown.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: tenancyDateUnknown.thereIsAProblemErrorMessageHeader,
    message: tenancyDateUnknown.thereIsAProblemErrorMessageHeader,
  });
  await performValidation('errorMessage', {
    header: tenancyDateUnknown.thereIsAProblemErrorMessageHeader,
    message: tenancyDateUnknown.monthMissingErrorMessage,
  });

  //This error message will trigger if no year value is provided
  await performAction('inputText', tenancyDateUnknown.dayTextLabel, tenancyDateUnknown.dayInputText);
  await performAction('inputText', tenancyDateUnknown.monthTextLabel, tenancyDateUnknown.monthInputText);
  await performAction('clickButton', tenancyDateUnknown.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: tenancyDateUnknown.thereIsAProblemErrorMessageHeader,
    message: tenancyDateUnknown.thereIsAProblemErrorMessageHeader,
  });
  await performValidation('errorMessage', {
    header: tenancyDateUnknown.thereIsAProblemErrorMessageHeader,
    message: tenancyDateUnknown.yearMissingErrorMessage,
  });

  //This error message will trigger if invalid date is provided
  await performAction('inputText', tenancyDateUnknown.dayTextLabel, '30');
  await performAction('inputText', tenancyDateUnknown.monthTextLabel, '13');
  await performAction('inputText', tenancyDateUnknown.yearTextLabel, '2025');
  await performAction('clickButton', tenancyDateUnknown.saveAndContinueButton);
  await performValidation('errorMessage', {
    header: tenancyDateUnknown.thereIsAProblemErrorMessageHeader,
    message: tenancyDateUnknown.thereIsAProblemErrorMessageHeader,
  });
  await performValidation('errorMessage', {
    header: tenancyDateUnknown.thereIsAProblemErrorMessageHeader,
    message: tenancyDateUnknown.realDateErrorMessage,
  });
}

export async function tenancyDateUnknownNavigationTests(): Promise<void> {
  await performValidation('pageNavigation', tenancyDateUnknown.backLink, startNow.mainHeader);
  await performAction('enterTenancyStartDetailsUnKnown', {
    tsDay: tenancyDateUnknown.dayInputText,
    tsMonth: tenancyDateUnknown.monthInputText,
    tsYear: tenancyDateUnknown.yearInputText,
  });
  await performValidation('pageNavigation', tenancyDateUnknown.saveForLaterButton, 'Dashboard');
}
