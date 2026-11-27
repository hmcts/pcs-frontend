import type { Application, Request, Response } from 'express';
import { cloneDeep } from 'lodash';

import { oidcMiddleware } from '../middleware/oidc';
import { MAKE_A_CLAIM_EVENT_ID, saveClaimDraftForCase } from '../steps/make-a-claim/claimDraft';
import { REASONABLE_ADJUSTMENTS_CALLBACK_PATH, pageAfterSupport } from '../steps/make-a-claim/handOffs';

import { http } from '@modules/http';
import { Logger } from '@modules/logger';
import { ccdCaseService } from '@services/ccdCaseService';
import { cuiRaService } from '@services/cuiRa/cuiRaService';
import { toCcdFlags } from '@services/cuiRa/flagMapping';
import { sanitiseCaseReference } from '@utils/caseReference';
import { isCuiYourSupportEnabled } from '@utils/isCuiYourSupportEnabled';
import { safeRedirect303 } from '@utils/safeRedirect';

const logger = Logger.getLogger('makeAClaimReasonableAdjustmentsCallback');

/**
 * The return leg from Your Support (cui-ra) for a claimant making a claim. A submit saves the flags it returns to
 * the claim draft, where pcs-api takes them onto the claimant at submit. A cancel, or a failure to fetch what was
 * answered, saves nothing. Either way the claimant carries on to the next page of the claim, as Your Support is optional.
 */
export default function makeAClaimReasonableAdjustmentsCallbackRoutes(app: Application): void {
  app.get(
    `/case/:caseReference/${REASONABLE_ADJUSTMENTS_CALLBACK_PATH}/:id`,
    oidcMiddleware,
    async (req: Request, res: Response) => {
      const caseReference = sanitiseCaseReference(String(req.params.caseReference ?? ''));
      if (!caseReference) {
        return safeRedirect303(res, '/', '/');
      }
      const payloadId = String(req.params.id ?? '');
      const fallback = `/case/${caseReference}/make-a-claim/task-list`;
      const accessToken = req.session.user?.accessToken ?? '';

      try {
        // Reading the draft through the claim's event also confirms the claimant may open this case
        const existing = await ccdCaseService.getCaseByIdForEvent(accessToken, caseReference, MAKE_A_CLAIM_EVENT_ID);
        const claim = cloneDeep(existing.data?.citizenPossessionClaim ?? {});

        if (await isCuiYourSupportEnabled(req)) {
          await saveReturnedFlags(accessToken, caseReference, payloadId, claim);
        }
        return safeRedirect303(res, await pageAfterSupport(req, claim, caseReference), fallback, ['/case']);
      } catch (error) {
        logger.error(`Failed to handle the Your Support return for case ${caseReference}`, error);
        return safeRedirect303(res, fallback, '/', ['/case']);
      }
    }
  );
}

async function saveReturnedFlags(
  accessToken: string,
  caseReference: string,
  payloadId: string,
  claim: Parameters<typeof saveClaimDraftForCase>[2]
): Promise<void> {
  const serviceToken = await http.getValidS2SToken();
  const payload = await cuiRaService.getPayload(payloadId, serviceToken);
  // The id comes from the URL, so the payload must be the one started for this case
  if (payload.correlationId !== caseReference) {
    logger.error(`Your Support payload ${payloadId} is for case '${payload.correlationId}', not ${caseReference}`);
    return;
  }
  if (payload.action !== 'submit') {
    return;
  }
  // cui-ra returns the full flag set in replacementFlags when flags were added, and in flagsAsSupplied (with the
  // cancelled ones marked) when flags were removed; a removal also sends an empty replacementFlags
  const flags = payload.replacementFlags?.details?.length ? payload.replacementFlags : payload.flagsAsSupplied;
  if (!flags?.details?.length) {
    return;
  }
  claim.otherInformation = { ...claim.otherInformation, supportFlags: toCcdFlags(flags) };
  await saveClaimDraftForCase(accessToken, caseReference, claim);
}
