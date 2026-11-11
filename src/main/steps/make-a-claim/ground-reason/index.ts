import type { Request } from 'express';

import { readClaim } from '../claimDraft';
import { claimMappings, groundForReasonOf } from '../claimMapping';
import { pageHeadingLongText } from '../fieldBuilders';
import { FIELD_LIMITS } from '../fieldLimits';
import { flowConfig } from '../flow.config';
import { createMakeAClaimStep } from '../formStep';
import { returnToOf, withReturnTo } from '../returnTo';

import { getTranslationFunction } from '@modules/steps';
import { getStepUrl } from '@modules/steps/flow';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import { groundsNeedingReasons } from '@services/citizenPossessionClaim.interface';

export const reasonUrl = (req: Request, ground: string): string =>
  `${getStepUrl('ground-reason', flowConfig, req.res?.locals.validatedCase?.id)}?ground=${ground}`;

/** A ground that needs no reason, or was not chosen, has no reason page: go to the first that does, if any. */
function redirectForUnknownGround(req: Request): string | undefined {
  const claim = readClaim(req);
  if (groundForReasonOf(req, claim)) {
    return undefined;
  }
  const first = groundsNeedingReasons(claim.grounds)[0];
  const url = first
    ? reasonUrl(req, first)
    : getStepUrl('other-grounds', flowConfig, req.res?.locals.validatedCase?.id);
  const returnTo = returnToOf(req);
  return returnTo ? withReturnTo(url, returnTo) : url;
}

/** One page for each ground that needs a reason, in the order the claimant chose them. */
export const step: StepDefinition = createMakeAClaimStep({
  stepName: 'ground-reason',
  stepDir: __dirname,
  fields: [pageHeadingLongText('groundReason', { required: true, maxLength: FIELD_LIMITS.groundReason })],
  redirectWhen: redirectForUnknownGround,
  extendGetContent: req => {
    const grounds = groundsNeedingReasons(readClaim(req).grounds);
    const ground = groundForReasonOf(req, readClaim(req));
    const position = ground ? grounds.indexOf(ground) : -1;
    return {
      ground: ground ? getTranslationFunction(req, ['makeAClaim', 'common'])(`makeAClaim:grounds.${ground}`) : '',
      ...(position > 0 ? { backUrl: reasonUrl(req, grounds[position - 1]) } : {}),
    };
  },
  keepsOwnRedirectOnReturn: req => !claimMappings['ground-reason'].isAnswered?.(readClaim(req), req),
  resolveRedirectAfterPost: async req => {
    const grounds = groundsNeedingReasons(readClaim(req).grounds);
    const ground = groundForReasonOf(req, readClaim(req));
    const next = ground ? grounds[grounds.indexOf(ground) + 1] : undefined;
    return next ? reasonUrl(req, next) : undefined;
  },
});
