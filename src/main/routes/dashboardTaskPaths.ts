/**
 * Maps CCD dashboard task templateIds to path patterns.
 * Use `:caseReference` as the segment placeholder; replaced in dashboard route handling.
 */
export const DASHBOARD_TASK_PATH_PATTERNS: Readonly<Record<string, string>> = {
  'Defendant.UploadDocuments': '/case/:caseReference/upload-additional-documents',
  'Defendant.ViewDocuments': '/case/:caseReference/view-documents',
  'Defendant.ViewClaim': '/case/:caseReference/view-the-claim',
};
