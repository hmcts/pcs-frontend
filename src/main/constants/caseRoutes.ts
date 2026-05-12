/**
 * Canonical `/case/:caseReference/...` path patterns shared by Express routes and dashboard links.
 */
import { RESPOND_TO_CLAIM_ROUTE } from '../steps/respond-to-claim/flow.config';

export { RESPOND_TO_CLAIM_ROUTE };

export const VIEW_THE_CLAIM_ROUTE = '/case/:caseReference/view-the-claim';

export const UPLOAD_ADDITIONAL_DOCUMENTS_JOURNEY_BASE =
  '/case/:caseReference/upload-additional-documents/upload-additional-documents';

export const UPLOAD_ADDITIONAL_DOCUMENTS_ROUTE = `${UPLOAD_ADDITIONAL_DOCUMENTS_JOURNEY_BASE}/start-evidence-upload`;

export const VIEW_DOCUMENTS_ROUTE = '/case/:caseReference/view-documents';

export const VIEW_HEARING_DOCUMENTS_ROUTE = '/case/:caseReference/view-hearing-documents';

export const VIEW_ORDERS_AND_NOTICES_ROUTE = '/case/:caseReference/view-orders-and-notices';

export const VIEW_ALL_APPLICATIONS_ROUTE = '/case/:caseReference/view-all-applications';

export const MAKE_GENERAL_APPLICATION_ROUTE = '/case/:caseReference/make-an-application/choose-an-application';

export const RESPOND_TO_CLAIM_START_ROUTE = `${RESPOND_TO_CLAIM_ROUTE}/start-now`;

export const VIEW_RESPONSE_ROUTE = '/case/:caseReference/view-the-response';
