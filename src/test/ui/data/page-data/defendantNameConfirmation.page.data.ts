import { firstName, lastName } from '../../utils/actions/custom-actions';

export const defendantNameConfirmation = {
  get mainHeader(): string {
    return `Is your name ${firstName} ${lastName}?`;
  },
  respondToClaimParagraph: 'Respond to a property possession claim',
  thisIsTheNameParagraph: 'This is the name on the claim form.',
  yesRadioOption: 'Yes',
  noRadioOption: 'No',
  saveAndContinueButton: 'Save and continue',
  saveForLaterButton: 'Save for later',
  backLink: 'Back',
};
