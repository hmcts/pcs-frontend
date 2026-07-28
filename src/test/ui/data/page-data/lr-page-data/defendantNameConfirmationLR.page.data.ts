export const defendantNameConfirmationLR = {
  mainHeader(clientFirstName: string, clientLastName: string): string {
    return `Is your client’s name ${clientFirstName} ${clientLastName}?`;
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
  youMustSayErrorMessage: `You must say if your client’s name is`,
  enterYourClientFirstNameErrorMessage: `Enter your client’s first name`,
  enterYourClientLastNameErrorMessage: `Enter your client’s last name`,
  firstNameInputText: `John`,
  lastNameInputText: `Doe`,
  enterFirstNameMaxLengthErrorMessage: `First name must be 60 characters or less`,
  enterLastNameMaxLengthErrorMessage: `Last name must be 60 characters or less`,
  emojiTextInput: `👉 😄`,
  emojiFirstNameErrorMessage: `First name must only include letters a to z, and special characters such as hyphens, spaces and apostrophes`,
  emojiLastNameErrorMessage: `Last name must only include letters a to z, and special characters such as hyphens, spaces and apostrophes`,
  feedbackLink: `feedback (opens in new tab)`,
  pageSlug: `defendant-name-confirmation`,
};
