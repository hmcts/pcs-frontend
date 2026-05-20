/** Maps CCD dashboard task `templateId` values to case path patterns in `caseRoutes`. */
import {
  MAKE_GENERAL_APPLICATION_ROUTE,
  RESPOND_TO_CLAIM_START_ROUTE,
  UPLOAD_ADDITIONAL_DOCUMENTS_ROUTE,
  VIEW_ALL_APPLICATIONS_ROUTE,
  VIEW_DOCUMENTS_ROUTE,
  VIEW_HEARING_DOCUMENTS_ROUTE,
  VIEW_ORDERS_AND_NOTICES_ROUTE,
  VIEW_THE_CLAIM_ROUTE,
} from '../constants/caseRoutes';

export const DASHBOARD_TASK_PATH_PATTERNS: Readonly<Record<string, string>> = {
  UploadDocuments: UPLOAD_ADDITIONAL_DOCUMENTS_ROUTE,
  ViewDocuments: VIEW_DOCUMENTS_ROUTE,
  ViewClaim: VIEW_THE_CLAIM_ROUTE,
  RespondToClaim: RESPOND_TO_CLAIM_START_ROUTE,
  ViewHearingDocuments: VIEW_HEARING_DOCUMENTS_ROUTE,
  ViewOrdersAndNotices: VIEW_ORDERS_AND_NOTICES_ROUTE,
  ViewAllApplications: VIEW_ALL_APPLICATIONS_ROUTE,
  MakeGeneralApplication: MAKE_GENERAL_APPLICATION_ROUTE,
};

/**
 * Resolves the same href the dashboard task list uses for a linkable task (canonical `/case/...`
 * when mapped; otherwise legacy `/dashboard/:caseRef/:group/:templateId`).
 */
export function getDashboardTaskPath(templateId: string, caseReference: string, fallbackTaskGroupId: string): string {
  const pattern = DASHBOARD_TASK_PATH_PATTERNS[templateId];
  if (pattern) {
    return pattern.replace(/:caseReference/g, caseReference);
  }
  return `/dashboard/${caseReference}/${fallbackTaskGroupId}/${templateId}`;
}

/** Named URL placeholders for `dashboard.json` notification bodies (i18n `{{viewClaimUrl}}`, etc.). */
export function getNotificationUrlPlaceholders(caseReference: string): Record<string, string> {
  return {
    viewClaimUrl: getDashboardTaskPath('ViewClaim', caseReference, 'claim'),
    respondToClaimUrl: getDashboardTaskPath('RespondToClaim', caseReference, 'response'),
    viewDocumentsUrl: getDashboardTaskPath('ViewDocuments', caseReference, 'documents'),
    uploadDocumentsUrl: getDashboardTaskPath('UploadDocuments', caseReference, 'documents'),
  };
}
