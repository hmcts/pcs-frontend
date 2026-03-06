import { tenancyStartDateKnown } from '../data/page-data';
import { performAction, performValidation } from '../utils/controller';

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
    message: tenancyStartDateKnown.RealDateErrorMessage,
  });
  await performAction('selectTenancyStartDateKnown', {
    option: tenancyStartDateKnown.noRadioOption,
    day: '',
    month: '12',
    year: '2025',
  });
  await performValidation('errorMessage', {
    message: tenancyStartDateKnown.DayMissingErrorMessage,
  });
  await performAction('selectTenancyStartDateKnown', {
    option: tenancyStartDateKnown.noRadioOption,
    day: '11',
    month: '',
    year: '2025',
  });
  await performValidation('errorMessage', {
    message: tenancyStartDateKnown.MonthMissingErrorMessage,
  });
  await performAction('selectTenancyStartDateKnown', {
    option: tenancyStartDateKnown.noRadioOption,
    day: '11',
    month: '12',
    year: '',
  });
  await performValidation('errorMessage', {
    message: tenancyStartDateKnown.YearMissingErrorMessage,
  });
}
