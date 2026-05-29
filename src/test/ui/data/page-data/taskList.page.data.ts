import { address } from '../../utils/actions/custom-actions/fetchPINsAndValidateAccessCodeAPI.action';

export const taskList = {
  get mainHeader(): string {
    return `${address}`;
  },
  caseNumberParagraph: (): string => `Case number: ${process.env.CASE_FID}`,
  iWantToHeader: 'I want to...',
  makeAGeneralApplicationLink: `Make a general application`,
  informTheCourtLink: `Inform the court of a breathing space debt respite`,
  getFreeHelpLink: `Get free help from a legal adviser`,
  helpAndSupportHeader: `Help and support`,
  helpWithFeesLink: `Help with fees`,
  findOutAboutMediationLink: `Find out about mediation`,
  whatToExpectLink: `What to expect at a hearing`,
  representMyselfLink: `Represent myself at a hearing`,
  findLegalAdviceLink: `Find legal advice`,
  findInformationLink: `Find information about my court`,
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
