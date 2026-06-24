import type { Application, Request, Response } from 'express';

import { UPLOAD_ADDITIONAL_DOCUMENTS_JOURNEY_BASE } from '../constants/caseRoutes';
import { oidcMiddleware } from '../middleware/oidc';
import { toCaseReference16 } from '../utils/caseReference';

import { getDashboardUrl } from './dashboard';

export const CANCEL_UPLOAD_ADDITIONAL_DOCUMENTS_ROUTE = `${UPLOAD_ADDITIONAL_DOCUMENTS_JOURNEY_BASE}/cancel`;

const JOURNEY_FORM_STEP_NAMES = [
  'confirm-if-these-documents-relate-to-an-application',
  'upload-your-documents',
  'check-your-answers',
];

export function cancelUploadJourney(req: Request, res: Response): void {
  const caseRef = toCaseReference16(req.params.caseReference);
  if (caseRef && req.session.uploadedDocs?.[caseRef]) {
    delete req.session.uploadedDocs[caseRef];
  }
  if (req.session.formData) {
    for (const stepName of JOURNEY_FORM_STEP_NAMES) {
      delete req.session.formData[stepName];
    }
  }
  const caseReferenceParam = Array.isArray(req.params.caseReference)
    ? req.params.caseReference[0]
    : req.params.caseReference;
  res.redirect(302, getDashboardUrl(caseReferenceParam) ?? '/dashboard');
}

export default function (app: Application): void {
  app.get(CANCEL_UPLOAD_ADDITIONAL_DOCUMENTS_ROUTE, oidcMiddleware, cancelUploadJourney);
}
