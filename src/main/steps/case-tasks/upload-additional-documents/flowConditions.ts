import type { Request } from 'express';

import { Logger } from '@modules/logger';
import type { StepCondition } from '@modules/steps/stepFlow.interface';
import { ccdCaseService } from '@services/ccdCaseService';

const logger = Logger.getLogger('uploadAdditionalDocumentsFlowConditions');

const UPLOAD_DOCUMENTS_EVENT_ID = 'uploadDocuments';

// Calls the uploadDocuments START handler which populates showRelatedApplicationsPage
// based on the gen-apps on this case. Returns true iff the BE flagged the case as
// having existing applications, in which case the confirm-…-application page is shown.
export const isViewAllApplicationsAvailable: StepCondition = async (req: Request) => {
  const accessToken = req.session?.user?.accessToken;
  const caseReference = req.res?.locals.validatedCase?.id;

  if (!accessToken || !caseReference) {
    return false;
  }

  try {
    const startResponse = await ccdCaseService.getCaseByIdForEvent(
      accessToken,
      caseReference,
      UPLOAD_DOCUMENTS_EVENT_ID
    );
    return startResponse.data?.showRelatedApplicationsPage?.toUpperCase() === 'YES';
  } catch (error) {
    logger.warn(`Failed to resolve uploadDocuments START for case ${caseReference}: ${String(error)}`);
    return false;
  }
};
