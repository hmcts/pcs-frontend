import { address } from '../../utils/actions/custom-actions/fetchPINsAndValidateAccessCodeAPI.action';
import { createCaseApiData } from '../api-data/createCase.api.data';

function getDefaultPostalAddress(): string {
  const propertyAddress = createCaseApiData.createCasePayload.propertyAddress;
  return [
    propertyAddress.AddressLine1,
    propertyAddress.AddressLine2,
    propertyAddress.AddressLine3,
    propertyAddress.PostTown,
    propertyAddress.County,
    propertyAddress.PostCode,
  ]
    .filter(Boolean)
    .join(', ');
}

export const correspondenceAddress = {
  get correspondenceAddressPostalMainHeader(): string {
    const postalAddress = process.env.CORRESPONDENCE_ADDRESS === 'UNKNOWN' ? getDefaultPostalAddress() : address;
    return `Is your postal address ${postalAddress}?`;
  },
  correspondenceAddressUnKnownMainHeader: `What’s your correspondence address?`,
  correspondenceAddressUnKnownParagraph: `Your correspondence address is your postal address.`,
  respondToClaimParagraph: `Respond to a property possession claim`,
  correspondenceAddressConfirmHintText: () => `This is the address provided by ${process.env.CLAIMANT_NAME}`,
  yesRadioOption: `Yes`,
  noRadioOption: `No`,
  backLink: `Back`,
  saveAndContinueButton: `Save and continue`,
  saveForLaterButton: `Save for later`,
  cymraegLink: `Cymraeg`,
  sectionHiddenTitle: `Enter correspondence address`,
  enterUKPostcodeHiddenTextLabel: `Enter a UK postcode`,
  findAddressHiddenButton: `Find address`,
  enterAddressManuallyHiddenLink: `Enter an address manually`,
  addressSelectHiddenLabel: `Select an address`,
  whatsYourPostalAddressQuestion: `What’s your postal address?`,
  whatsYourAddressHiddenQuestion: `What’s your correspondence address?`,
  addressLine1HiddenTextLabel: `Address Line 1`,
  addressLine2HiddenTextLabel: `Address Line 2 (Optional)`,
  townOrCityHiddenTextLabel: `Town or City`,
  countyHiddenTextLabel: `County (Optional)`,
  postcodeHiddenTextLabel: `Postcode`,
  addressIndex: 1,
  addressLine2TextInput: `address2`,
  englandAddressLine1TextInput: `1 Second Avenue`,
  englandTownOrCityTextInput: `London`,
  englandCountyTextInput: `Greater London`,
  englandPostcodeTextInput: `W3 7RX`,
  walesAddressLine1TextInput: `2 Pentre Street`,
  walesTownOrCityTextInput: `Caerdydd`,
  walesCountyTextInput: `Cardiff`,
  walesPostcodeTextInput: `CF11 6QX`,
  thereIsAProblemErrorMessageHeader: `There is a problem`,
  pleaseConfirmYourAddressErrorMessage: `Please confirm your address by selecting the options below`,
  enterValidPostcodeErrorMessage: `Enter a valid UK postcode`,
  postCodeNotFoundErrorMessage: `Postcode not found. Please check and try again.`,
  pleaseSelectAnAddressErrorMessage: `Please select an address`,
  enterAddressLine1ErrorMessage: `Enter address line 1, typically the building and street`,
  enterTownOrCityErrorMessage: `Enter town or city`,

  //The below section will be deleted once correspondence address functional tests automatically handle page routing - will be implemented in a new story
  errorValidation: `YES`,
  errorValidationType: { input: `textField`, radio: `radioOptions` },
  errorValidationHeader: `There is a problem`,
  errorValidationField: {
    errorRadioMsg: [{ errMessage: `Please confirm your address by selecting the options below` }],
    errorTextField1: [{ type: `empty`, label: `Enter a UK postcode`, errMessage: `Enter a valid UK postcode` }],
    errorTextField2: [
      { type: `empty`, label: `Enter a UK postcode`, errMessage: `Postcode not found. Please check and try again.` },
    ],
    errorTextField3: [{ type: `empty`, label: `Select an address`, errMessage: `Please select an address` }],
    errorTextField4: [
      { type: `empty`, label: `Address line 1`, errMessage: `Enter address line 1, typically the building and street` },
      { type: `empty`, label: `Town or city`, errMessage: `Enter town or city` },
      { type: `empty`, label: `Postcode`, errMessage: `Enter a valid UK postcode` },
    ],
  },
};
