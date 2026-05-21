import { createCaseApiData } from '../api-data';
import { createCaseApiWalesData } from '../api-data/createCaseWales.api.data';

export const dashboard = {
  get mainHeader() {
    return process.env.WALES_POSTCODE === 'YES'
      ? `${createCaseApiWalesData.createCasePayload.propertyAddress.AddressLine1}, ${createCaseApiWalesData.createCasePayload.propertyAddress.PostTown}, ${createCaseApiWalesData.createCasePayload.propertyAddress.PostCode}`
      : `${createCaseApiData.createCasePayload.propertyAddress.AddressLine1}, ${createCaseApiData.createCasePayload.propertyAddress.PostTown}, ${createCaseApiData.createCasePayload.propertyAddress.PostCode}`;
  },
  caseNumberParagraph: (): string => `Case number: ${process.env.CASE_FID}`,
  iWantToHeader: 'I want to...',
  askTheCourtToMakeAnOrderLink: 'Ask the court to make an order (make a general application)',
  uploadAdditionalDocumentsLink: 'Upload additional documents',
  helpAndSupportHeader: `Help and support`,
  helpWithFeesLink: `Help with fees`,
  getHelpPayingCourtFeesHeader: `Get help paying court and tribunal fees`,
  whatToExpectAtHearingLink: `What to expect at a hearing`,
  whatToExpectComingCourtHeader: `What to expect coming to a court or tribunal`,
  representMyselfAtHearingLink: `Represent myself at a hearing`,
  representYourselfHeader: `Represent yourself in court`,
  findLegalAdviceLink: `Find legal advice`,
  findLegalAdviceHeader: `Find legal advice and information`,
  getDebtRespiteLink: `Get debt respite (Breathing Space)`,
  breathingSpaceHeader: `Breathing Space (Debt Respite Scheme)`,
  findInfoAboutMyCourtLink: `Find information about my court`,
  findACourtOrTribunalHeader: `Find a court or tribunal`,
  theClaimSubHeader: `The claim against you`,
  viewTheClaimLink: `View the claim`,
  documentsSubHeader: `Documents`,
  viewDocumentsLink: `View documents`,
  courtHearingSubHeader: `Court hearings`,
  viewHearingDocumentsLink: `View hearing documents`,
  ordersNoticesFromCourtSubHeader: `Orders and notices from the court`,
  viewOrdersAndNoticesLink: `View orders and notices`,
  applicationsSubHeader: `Applications`,
  viewAllApplicationsLink: `View all applications`,
  aPropertyPossessionClaimSubHeader: `A property possession claim has been made against you`,
  courtWillArrangeHearingParagraph: `The court will arrange the hearing and contact you with details.`,
  yourResponseSubHeader: `Your response`,
  respondToClaimBeforeHearingParagraph: `You should respond to the claim before the hearing.`,
  startYourResponseLink: `Start your response`,
  completeClaimBeforeHearingParagraph: `You should complete your response before the hearing.`,
  continueYourResponseLink: `Continue with your response`,
  respondedToClaimParagraph: `You have responded to the claim`,
  respondToAPropertyHeader: `Respond to a property possession claim online`,
  respondToTheClaimSubHeader: `Respond to the claim`,
  viewTheResponseSubHeader: `View the response`,
  notStartedTag: `Not started`,
  inProgressTag: `In progress`,
  completedTag: `Completed`
};
