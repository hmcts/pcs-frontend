const formatSubmittedDate = (): string =>
  new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

export const viewAllApplications = {
  mainHeader: `View all applications`,
  getCaseNumber: () => `Case number: ${process.env.CASE_FID}`,
  getSubmittedDate: formatSubmittedDate,
  yourApplicationsSubHeader: `Your applications`,
  generalApplicationGA1Defendant1Link: `General Application GA1 - Defendant 1.pdf`,
  generalApplicationGA1Defendant2Link: `General Application GA1 - Defendant 2.pdf`,
  generalApplicationGA1Defendant3Link: `General Application GA1 - Defendant 3.pdf`,
};
