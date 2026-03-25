import { createCaseApiData } from '../api-data';
import { submitCaseApiDataWales } from '../api-data/submitCaseWales.api.data';

export const dashboard = {
  get mainHeader() {
    return process.env.WALES_POSTCODE === 'YES'
      ? `${submitCaseApiDataWales.submitCasePayload.propertyAddress.AddressLine1}, ${submitCaseApiDataWales.submitCasePayload.propertyAddress.PostTown}, ${submitCaseApiDataWales.submitCasePayload.propertyAddress.PostCode}`
      : `${createCaseApiData.createCasePayload.propertyAddress.AddressLine1}, ${createCaseApiData.createCasePayload.propertyAddress.PostTown}, ${createCaseApiData.createCasePayload.propertyAddress.PostCode}`;
  },
  caseNumberParagraph: (): string => `Case number: ${process.env.CASE_FID}`,
  helpAndSupportHeader: `Help and support`,
  helpWithFeesLink: `Help with fees`,
  getHelpPayingCourtAndTribunalFeesHeader: `Get help paying court and tribunal fees`,
  findOutAboutMediationLink: `Find out about mediation`,
  aGuideToCivilMediationHeader: `A guide to civil mediation`,
  whatToExpectAtAHearingLink: `What to expect at a hearing`,
  whatToExpectComingToACourtOrTribunalHeader: `What to expect coming to a court or tribunal`,
  representMyselfAtAHearingLink: `Represent myself at a hearing`,
  representYourselfInCourtHeader: `Represent yourself in court`,
  findLegalAdviceLink: `Find legal advice`,
  findLegalAdviceAndInformationHeader: `Find legal advice and information`,
  findInformationAboutMyCourtLink: `Find information about my court`,
  findACourtOrTribunalHeader: `Find a court or tribunal`,
};
