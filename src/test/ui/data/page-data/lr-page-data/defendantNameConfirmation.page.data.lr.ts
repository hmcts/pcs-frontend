export const defendantNameConfirmation = {
  mainHeader(clientFirstName: string, clientLastName: string): string {
    return `Is the defendant’s name ${clientFirstName} ${clientLastName}?`;
  },
  get thisIsTheNameHintText(): string {
    return `This is the name provided by ${process.env.CLAIMANT_NAME}`;
  },
  yesRadioOption: `Yes`,
  noRadioOption: `No`,
  saveAndContinueButton: `Save and continue`,
  saveForLaterButton: `Save for later`,
  backLink: `Back`,
  cymraegLink: `Cymraeg`,
  thereIsAProblemErrorMessageHeader: `There is a problem`,
  youMustSayErrorMessage(clientFirstName: string, clientLastName: string): string {
    return `You must say if the defendant’s name is ${clientFirstName} ${clientLastName}`;
  },
  enterDefendantFirstNameErrorMessage: `Enter the defendant’s first name`,
  enterDefendantLastNameErrorMessage: `Enter the defendant’s last name`,
  defendantFirstNameHiddenTextLabel: `Defendant’s first name`,
  defendantLastNameHiddenTextLabel: `Defendant’s last name`,
  firstNameInputText: `John`,
  lastNameInputText: `Doe`,
  enterFirstNameMaxLengthErrorMessage: `First name must be 60 characters or less`,
  enterLastNameMaxLengthErrorMessage: `Last name must be 60 characters or less`,
  emojiTextInput: `👉 😄`,
  emojiFirstNameErrorMessage: `Defendant’s first name must only include letters a to z, and special characters such as hyphens, spaces and apostrophes`,
  emojiLastNameErrorMessage: `Defendant’s last name must only include letters a to z, and special characters such as hyphens, spaces and apostrophes`,
  feedbackLink: `feedback`,
  pageSlug: `defendant-name-confirmation`,
};
