import type { Application, Request, Response } from 'express';

import { UPLOAD_ADDITIONAL_DOCUMENTS_JOURNEY_BASE } from '../constants/caseRoutes';
import { oidcMiddleware } from '../middleware/oidc';
import { toCaseReference16 } from '../utils/caseReference';

import { getDashboardUrl } from './dashboard';

import { clearFormData } from '@modules/steps';

export const CANCEL_UPLOAD_ADDITIONAL_DOCUMENTS_ROUTE = `${UPLOAD_ADDITIONAL_DOCUMENTS_JOURNEY_BASE}/cancel`;

export function cancelUploadJourney(req: Request, res: Response): void {
  const caseRef = toCaseReference16(req.params.caseReference);
  if (caseRef && req.session.uploadedDocs?.[caseRef]) {
    delete req.session.uploadedDocs[caseRef];
  }
  if (caseRef) {
    clearFormData(req, { journey: 'uploadAdditionalDocuments', caseReference: caseRef });
  }
  const caseReferenceParam = Array.isArray(req.params.caseReference)
    ? req.params.caseReference[0]
    : req.params.caseReference;
  res.redirect(302, getDashboardUrl(caseReferenceParam) ?? '/dashboard');
}

export default function (app: Application): void {
  app.get(CANCEL_UPLOAD_ADDITIONAL_DOCUMENTS_ROUTE, oidcMiddleware, cancelUploadJourney);
}
