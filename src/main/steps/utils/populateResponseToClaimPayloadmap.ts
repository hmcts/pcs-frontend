import { Request } from 'express';

import type { SubmitDefendantResponseData } from '../../generated/ccd/PCS';
import { ccdCaseService } from '../../services/ccdCaseService';

export const submitDefendantResponseDraft = async (
  req: Request,
  responseData: SubmitDefendantResponseData
) =>
  ccdCaseService.submitResponseToClaim(
    req.session?.user?.accessToken,
    req.res?.locals.validatedCase?.id || '',
    responseData
  );
