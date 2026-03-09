import { firstName, lastName } from '../../utils/actions/custom-actions';

export const defendantNameConfirmation = {
  get mainHeader(): string {
    return `Is your name ${firstName} ${lastName}?`;
  },
  respondToClaimParagraph: 'Respond to a property possession claim',
  thisIsTheNameParagraph: 'This is the name on the claim form.',
  isYourNameCorrect: 'Is your Name',
  yesRadioOption: 'Yes',
  noRadioOption: 'No',
  saveAndContinueButton: 'Save and continue',
  saveForLaterButton: 'Save for later',
  backLink: 'Back',
  firstNameHiddenLabelText: 'First name',
  lastNameHiddenLabelText: 'Last name',
  cymraegLink: 'Cymraeg',
  firstNameInputText: 'John',
  lastNameInputText: 'Doe',
  thereIsAProblemErrorMessageHeader: 'There is a problem',
  enterYourFirstNameErrorMessage: 'Enter your first name',
  enterYourLastNameErrorMessage: 'Enter your last name',
  enterFirstNameMaxLengthErrorMessage: 'First name must be 60 characters or less',
  enterLastNameMaxLengthErrorMessage: 'Last name must be 60 characters or less',
};
