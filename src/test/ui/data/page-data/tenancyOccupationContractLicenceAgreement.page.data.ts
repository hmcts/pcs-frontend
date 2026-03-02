import { formatText } from '../../utils/actions/custom-actions';
import { submitCaseApiData } from '../api-data';

export function buildDynamicText(prefix?: string | null, dynamicValue?: string | null, suffix?: string | null): string {
  return [prefix, dynamicValue, suffix]
    .filter(part => part !== null && part !== undefined)
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

export const tenancyOccupationContractLicenseAgreement = {
  mainHeader: 'Tenancy, occupation contract or licence agreement',
  respondToAPropertyPossessionParagraph: 'Respond to a property possession claim',
  whenTheyMadeClaimHintText: `When they made their claim, ${submitCaseApiData.submitCasePayload.claimantName} had to give details about the type of tenancy, occupation contract or licence agreement you signed to rent your property, and the date it began, if known.`,
  detailsGivenByClaimantParagraph: `Details given by ${submitCaseApiData.submitCasePayload.claimantName}:`,
  propertyLetUnderAgreementTypeParagraph: buildDynamicText(
    'The property is let under an ',
    formatText(submitCaseApiData.submitCasePayload.tenancy_TypeOfTenancyLicence),
    ' agreement'
  ),
  isTenancyTypeCorrectQuestion: 'Is the tenancy, occupation contract or licence agreement type correct?',
  imNotSureRadioOption: 'I’m not sure',
  noRadioOption: 'No',
  orHintText: 'or',
  yesRadioOption: 'Yes',
  saveForLaterButton: 'Save for later',
  saveAndContinueButton: 'Save and continue',
};
