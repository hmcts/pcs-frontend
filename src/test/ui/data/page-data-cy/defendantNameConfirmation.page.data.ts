import { firstName, lastName } from '../../utils/actions/custom-actions/fetchPINsAndValidateAccessCodeAPI.action';

export const defendantNameConfirmation = {
  get mainHeader(): string {
    return `A yw eich enw ${firstName} ${lastName}?`;
  },
  get nameErrorMessage(): string {
    return `Rhaid i chi ddweud ai ${firstName} ${lastName} yw eich enw`;
  },
  thisIsTheNameHintText: `Dyma’r enw a ddarparwyd gan PCS_Local_Auth_Org_Testing`,
  yesRadioOption: `Ydy`,
  noRadioOption: `Nac ydy`,
  saveAndContinueButton: `Cadw a pharhau`,
  saveForLaterButton: `Cadw at hwyrach ymlaen`,
  backLink: `Yn ôl`,
  firstNameHiddenTextLabel: `Enw cyntaf`,
  lastNameHiddenTextLabel: `Cyfenw`,
  cymraegLink: `Cymraeg`,
  firstNameInputText: `John`,
  lastNameInputText: `Doe`,
  thereIsAProblemErrorMessageHeader: `Mae yna broblem`,
  enterYourFirstNameErrorMessage: `Nodwch eich enw cyntaf`,
  enterYourLastNameErrorMessage: `Nodwch eich cyfenw`,
  enterFirstNameMaxLengthErrorMessage: `Rhaid i’r enw cyntaf fod yn 60 nod neu lai`,
  enterLastNameMaxLengthErrorMessage: `Rhaid i’r cyfenw fod yn 60 nod neu lai`,
  emojiTextInput: `👉 😄`,
  emojiFirstNameErrorMessage: `Dylai Enw cyntaf ond cynnwys llythrennau a i z, a nodau arbennig fel cysylltnod, bylchau a chollnod`,
  emojiLastNameErrorMessage: `Dylai Cyfenw ond cynnwys llythrennau a i z, a nodau arbennig fel cysylltnod, bylchau a chollnod`,
  feedbackLink: `adborth (yn agor mewn tab newydd)`,
  pageSlug: `defendant-name-confirmation`,
};
