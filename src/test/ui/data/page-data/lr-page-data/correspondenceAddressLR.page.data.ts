// import { address } from '../../../utils/actions/custom-actions';
// import { createCaseApiData } from '../../api-data';
// import { createCaseApiWalesData } from '../../api-data/createCaseWales.api.data';
//
// function getDefaultPostalAddressLR(): string {
//   const isWalesJourney = process.env.WALES_POSTCODE && process.env.WALES_POSTCODE.toUpperCase() === 'YES';
//
//   const propertyAddress = isWalesJourney
//     ? createCaseApiWalesData.createCasePayload.propertyAddress
//     : createCaseApiData.createCasePayload.propertyAddress;
//
//   return [
//     propertyAddress.AddressLine1,
//     propertyAddress.AddressLine2,
//     propertyAddress.AddressLine3,
//     propertyAddress.PostTown,
//     propertyAddress.County,
//     propertyAddress.PostCode,
//   ]
//     .filter(Boolean)
//     .join(', ');
// }

export const correspondenceAddressLR = {
  // get correspondenceAddressPostalMainHeader(): string {
  //   const postalAddress = process.env.CORRESPONDENCE_ADDRESS === 'UNKNOWN' ? getDefaultPostalAddressLR() : address;
  //   return `Is your postal address ${postalAddress}?`;
  // },
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
};
