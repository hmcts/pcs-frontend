import { submitCaseApiData } from '../api-data';

export const noticeDetails = {
  mainHeader: 'Notice details',
  respondToAPropertyPossessionParagraph: 'Respond to a property possession claim',
  noticeIsAFormalHintText:
    'A notice is a formal document from your landlord or mortgage provider saying they plan to take legal action to repossess the property, which must follow certain legal requirements',
  backLink: 'Back',
  get didClaimantGiveYouQuestion(): string {
    const claimantName =
      submitCaseApiData.submitCasePayloadNoDefendants?.overriddenClaimantName ||
      submitCaseApiData.submitCasePayload.claimantName;
    return `Did ${claimantName} give you notice of their intention to begin possession proceedings?`;
  },
  imNotSureRadioOption: "I'm not sure",
  noRadioOption: 'No',
  orHintText: 'or',
  saveAndContinueButton: 'Save and continue',
  saveForLaterButton: 'Save for later',
  signOutLink: 'Sign out',
  yesRadioOption: 'Yes',
  errorValidation: 'YES',
  errorValidationType: { input: 'textField', radio: 'radioOptions', checkbox: 'checkBox' },
  errorValidationHeader: 'There is a problem',
  errorValidationField: {
    errorRadioMsg: [
      {
        get errMessage(): string {
          const claimantName =
            submitCaseApiData.submitCasePayloadNoDefendants?.overriddenClaimantName ||
            submitCaseApiData.submitCasePayload.claimantName;
          return `Select if ${claimantName} gave you notice of their intention to begin possession proceedings`;
        },
      },
    ],
  },
};
