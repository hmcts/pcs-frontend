import { firstName, lastName } from '../../utils/actions/custom-actions/fetchPINsAndValidateAccessCodeAPI.action';

export const defendantNameConfirmation = {
  get mainHeader(): string {
    return `Is your name ${firstName} ${lastName}?`;
  },
  getLrMainHeader(clientFirstName: string, clientLastName: string): string {
    return `Is your client’s name ${clientFirstName} ${clientLastName}?`;
  },
  get nameErrorMessage(): string {
    return `You must say if your name is ${firstName} ${lastName}`;
  },
  thisIsTheNameHintText: `This is the name provided by Possession Claims Solicitor Org`,
  yesRadioOption: `Yes`,
  noRadioOption: `No`,
  saveAndContinueButton: `Save and continue`,
  saveForLaterButton: `Save for later`,
  backLink: `Back`,
  firstNameHiddenTextLabel: `First name`,
  lastNameHiddenTextLabel: `Last name`,
  cymraegLink: `Cymraeg`,
  firstNameInputText: `John`,
  lastNameInputText: `Doe`,
  thereIsAProblemErrorMessageHeader: `There is a problem`,
  enterYourFirstNameErrorMessage: `Enter your first name`,
  enterYourLastNameErrorMessage: `Enter your last name`,
  enterFirstNameMaxLengthErrorMessage: `First name must be 60 characters or less`,
  enterLastNameMaxLengthErrorMessage: `Last name must be 60 characters or less`,
  emojiTextInput: `👉 😄`,
  emojiFirstNameErrorMessage: `First name must only include letters a to z, and special characters such as hyphens, spaces and apostrophes`,
  emojiLastNameErrorMessage: `Last name must only include letters a to z, and special characters such as hyphens, spaces and apostrophes`,
  feedbackLink: `feedback (opens in new tab)`,
  pageSlug: `defendant-name-confirmation`,
};
