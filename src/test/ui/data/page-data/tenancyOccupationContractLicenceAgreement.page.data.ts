import { submitCaseApiData } from '../api-data';

export const tenancyOccupationContractLicenseAgreement = {
  mainHeader: 'Tenancy, occupation contract or licence agreement',
  respondToAPropertyPossessionParagraph: 'Respond to a property possession claim',
  whenTheyMadeClaimHintText: `When they made their claim, ${submitCaseApiData.submitCasePayload.claimantName} had to give details about the type of tenancy, occupation contract or licence agreement you signed to rent your property, and the date it began, if known.`,
  detailsGivenByClaimantParagraph: `Details given by ${submitCaseApiData.submitCasePayload.claimantName}:`,
  isTenancyTypeCorrectQuestion: 'Is the tenancy, occupation contract or licence agreement type correct?',
  giveCorrectTenancyTypeHiddenTextLabel: 'Give the correct tenancy, occupation contract or licence type',
  giveCorrectTenancyTypeTextInput: 'Short term tenancy',
  imNotSureRadioOption: 'I’m not sure',
  noRadioOption: 'No',
  orHintText: 'or',
  yesRadioOption: 'Yes',
  saveForLaterButton: 'Save for later',
  saveAndContinueButton: 'Save and continue',
};
