import { address } from '../../utils/actions/custom-actions/fetchPINsAndValidateAccessCodeAPI.action';

export const taskList = {
  get mainHeader(): string {
    return `${address}?`;
  },
  backLink: `Back`,
  checkBeforeYouStartHeading: `1. Check before you start`,
  readInformationAboutLink: `Read information about responding and free legal advice`,
  confirmDetailsLink: `Confirm your details and contact preferences`,
  respondToSpecificPartsOfClaimantsClaimLink: `Respond to specific parts of the claimant’s claim`,
  householdAndCircumstancesLink: `Give details about your household and circumstances`,
  incomeAndExpensesLink: `Give details about your income and expenses`,
  uploadDocumentsLink: `Upload documents`,
  checkYourAnswersAndSubmitLink: `Check your answers and submit`,
  declareRecentPaymentsHiddenLink: `Declare recent payments or agreements made`,
};
