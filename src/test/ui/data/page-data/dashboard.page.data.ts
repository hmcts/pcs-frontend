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
  findOutAboutMediationLink: `Find out about mediation`,
  aGuideToCivilMediationHeader: `A guide to civil mediation`,
  whatToExpectAtHearingLink: `What to expect at a hearing`,
  whatToExpectComingCourtHeader: `What to expect coming to a court or tribunal`,
  representMyselfAtHearingLink: `Represent myself at a hearing`,
  representYourselfHeader: `Represent yourself in court`,
  findLegalAdviceLink: `Find legal advice`,
  findLegalAdviceHeader: `Find legal advice and information`,
  findInfoAboutMyCourtLink: `Find information about my court`,
  findACourtOrTribunalHeader: `Find a court or tribunal`,
};
