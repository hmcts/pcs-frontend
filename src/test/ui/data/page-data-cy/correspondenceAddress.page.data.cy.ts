import { address } from '../../utils/actions/custom-actions/fetchPINsAndValidateAccessCodeAPI.action';
import { createCaseApiData } from '../api-data/createCase.api.data';
import { createCaseApiWalesData } from '../api-data/createCaseWales.api.data';

function getDefaultPostalAddress(): string {
  const isWalesJourney = process.env.WALES_POSTCODE && process.env.WALES_POSTCODE.toUpperCase() === 'YES';

  const propertyAddress = isWalesJourney
    ? createCaseApiWalesData.createCasePayload.propertyAddress
    : createCaseApiData.createCasePayload.propertyAddress;

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
    return `Ai dyma yw eich cyfeiriad post ${postalAddress}?`;
  },
  correspondenceAddressUnKnownMainHeader: `Beth yw eich cyfeiriad gohebiaeth?`,
  correspondenceAddressUnKnownParagraph: `Eich cyfeiriad post yw eich cyfeiriad gohebiaeth.`,
  respondToClaimParagraph: `Respond to a property possession claim`,
  correspondenceAddressConfirmHintText: () => `Dyma’r cyfeiriad a ddarparwyd gan ${process.env.CLAIMANT_NAME}`,
  yesRadioOption: `Ie`,
  noRadioOption: `Na`,
  backLink: `Yn ôl`,
  saveAndContinueButton: `Cadw a pharhau`,
  saveForLaterButton: `Cadw at hwyrach ymlaen`,
  cymraegLink: `English`,
  sectionHiddenTitle: `Rhowch gyfeiriad gohebiaeth`,
  enterUKPostcodeHiddenTextLabel: `Nodwch god post yn y DU`,
  findAddressHiddenButton: `Dod o hyd i gyfeiriad`,
  enterAddressManuallyHiddenLink: `Teipiwch gyfeiriad â llaw`,
  addressSelectHiddenLabel: `Dewiswch gyfeiriad`,
  whatsYourPostalAddressQuestion: `Beth yw eich cyfeiriad ar gyfer gohebiaeth?`,
  whatsYourAddressHiddenQuestion: `What’s your correspondence address?`,
  addressLine1HiddenTextLabel: `Llinell cyfeiriad 1`,
  addressLine2HiddenTextLabel: `Llinell cyfeiriad 2 (dewisol)`,
  townOrCityHiddenTextLabel: `Tref neu ddinas`,
  countyHiddenTextLabel: `Sir (dewisol)`,
  postcodeHiddenTextLabel: `Cod post`,
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
  thereIsAProblemErrorMessageHeader: `Mae yna broblem`,
  pleaseConfirmYourAddressErrorMessage: `Cadarnhewch eich cyfeiriad drwy ddewis yr opsiynau isod`,
  enterValidPostcodeErrorMessage: `Nodwch god post dilys yn y DU`,
  postCodeNotFoundErrorMessage: `Heb ddod o hyd i god post. Gwiriwch y manylion a rhowch gynnig arall arni.`,
  pleaseSelectAnAddressErrorMessage: `Dewiswch gyfeiriad`,
  enterAddressLine1ErrorMessage: `Rhowch linell cyfeiriad 1, fel arfer yr adeilad a’r stryd`,
  enterTownOrCityErrorMessage: `Nodwch dref neu ddinas`,

  //The below section will be deleted once correspondence address functional tests automatically handle page routing - will be implemented in a new story
  errorValidation: `YES`,
  errorValidationType: { input: `textField`, radio: `radioOptions` },
  errorValidationHeader: `Mae yna broblem`,
  errorValidationField: {
    errorRadioMsg: [{ errMessage: `Cadarnhewch eich cyfeiriad drwy ddewis yr opsiynau isod` }],
    errorTextField1: [{ type: `empty`, label: `Nodwch god post yn y DU`, errMessage: `Nodwch god post dilys yn y DU` }],
    errorTextField2: [
      {
        type: `empty`,
        label: `Nodwch god post yn y DU`,
        errMessage: `Heb ddod o hyd i god post. Gwiriwch y manylion a rhowch gynnig arall arni.`,
      },
    ],
    errorTextField3: [{ type: `empty`, label: `Dewiswch gyfeiriad`, errMessage: `Dewiswch gyfeiriad` }],
    errorTextField4: [
      {
        type: `empty`,
        label: `Llinell cyfeiriad 1`,
        errMessage: `Rhowch linell cyfeiriad 1, fel arfer yr adeilad a’r stryd`,
      },
      { type: `empty`, label: `Tref neu ddinas`, errMessage: `Nodwch tref neu ddinas` },
      { type: `empty`, label: `Cod post`, errMessage: `Nodwch god post dilys yn y DU` },
    ],
  },
};
