const formatCaseNumber = (value: string): string =>
  value
    .replace(/-/g, '')
    .replace(/(\d{4})(?=\d)/g, '$1 ')
    .trim();

const formatSubmittedDate = (): string =>
  new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

export const viewDocuments = {
  mainHeader: `View documents`,

  getCaseNumber: () => `Case number:\n${formatCaseNumber(process.env.CASE_NUMBER ?? '')}`,

  getSubmittedDate: formatSubmittedDate,

  statementsOfCaseSubHeader: `Statements of case`,
  propertyDocumentsSubHeader: `Property documents`,
  evidenceSubHeader: `Evidence`,
  correspondenceSubHeader: `Correspondence`,

  claimFormLink: `Claim form.pdf`,
  noticeServiceJurisdictionLink: `NoticeServiceJurisdiction - Claimant 1.docx`,
  rentStatementLink: `RentStatement - Claimant 1.pdf`,
  witnessStatementLink: `WitnessStatement - Claimant 1.png`,
  certificateOfSuitabilityLink: `CertificateOfSuitability - Claimant 1.xlsx`,

  pageSlug: `view-documents`,
};
