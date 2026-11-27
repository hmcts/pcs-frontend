import { createCaseApiData } from '../api-data';
import { createCaseApiWalesData } from '../api-data/createCaseWales.api.data';

export const taskList = {
  get mainHeader() {
    return process.env.WALES_POSTCODE === 'YES'
      ? `${createCaseApiWalesData.createCasePayload.propertyAddress.AddressLine1}, ${createCaseApiWalesData.createCasePayload.propertyAddress.PostTown}, ${createCaseApiWalesData.createCasePayload.propertyAddress.PostCode}`
      : `${createCaseApiData.createCasePayload.propertyAddress.AddressLine1}, ${createCaseApiData.createCasePayload.propertyAddress.PostTown}, ${createCaseApiData.createCasePayload.propertyAddress.PostCode}`;
  },
  caseNumberParagraph: (): string => `Rhif yr achos: ${process.env.CASE_FID}`,
  iWantToHeader: `Rwyf am...`,
  makeAGeneralApplicationLink: `Gwneud cais cyffredinol`,
  informTheCourtLink: `Rhoi gwybod i'r llys am seibiant dyledion`,
  getFreeHelpLink: `Cael cymorth cyfreithiol am ddim gan gynghorydd cyfreithiol`,
  helpAndSupportHeader: `Help a chymorth`,
  helpWithFeesLink: `Help gyda Ffioedd`,
  findOutAboutMediationLink: `Dysgwch am gyfryngu`,
  whatToExpectLink: `Beth i'w ddisgwyl mewn gwrandawiad`,
  representMyselfLink: `Cynrychioli fy hun mewn gwrandawiad`,
  findLegalAdviceLink: `Dod o hyd i gyngor cyfreithiol`,
  findInformationLink: `Dod o hyd i wybodaeth am fy llys`,
  backLink: `Yn ôl`,
  checkBeforeYouStartHeading: `1. Gwiriwch cyn i chi ddechrau`,
  readInformationAboutLink: `Darllenwch wybodaeth am ymateb a chyngor cyfreithiol am ddim`,
  confirmDetailsLink: `Cadarnhau eich manylion a'ch dewisiadau cyswllt`,
  respondToSpecificPartsOfClaimantsClaimLink: `Ymateb i rannau penodol o hawliad yr hawlydd`,
  householdAndCircumstancesLink: `Rhoi manylion am eich cartref a'ch amgylchiadau`,
  incomeAndExpensesLink: `Rhoi manylion am eich incwm a'ch treuliau`,
  uploadDocumentsLink: `Uwchlwytho dogfennau`,
  checkYourAnswersAndSubmitHiddenLink: `Gwirio eich atebion a'u cyflwyno`,
  declareRecentPaymentsHiddenLink: `Datgan taliadau neu gytundebau diweddar`,
  yourSupportLink: `Eich cymorth`,
  doneDynamicTag: `Wedi'i gwblhau`,
  availableTag: `Ar gael`,
};
