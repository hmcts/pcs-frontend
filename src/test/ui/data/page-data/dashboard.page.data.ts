import { createCaseApiData } from '../api-data';
import { createCaseApiWalesData } from '../api-data/createCaseWales.api.data';

export const dashboard = {
  get mainHeader() {
    return process.env.WALES_POSTCODE === 'YES'
      ? `${createCaseApiWalesData.createCasePayload.propertyAddress.AddressLine1}, ${createCaseApiWalesData.createCasePayload.propertyAddress.PostTown}, ${createCaseApiWalesData.createCasePayload.propertyAddress.PostCode}`
      : `${createCaseApiData.createCasePayload.propertyAddress.AddressLine1}, ${createCaseApiData.createCasePayload.propertyAddress.PostTown}, ${createCaseApiData.createCasePayload.propertyAddress.PostCode}`;
  },
  caseNumberParagraph: (): string => `Case number: ${process.env.CASE_FID}`,
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
};
