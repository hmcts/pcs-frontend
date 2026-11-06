import type { Request } from 'express';

import { readClaim } from '../claimDraft';
import { groundForReasonOf } from '../claimMapping';
import { pageHeadingLongText } from '../fieldBuilders';
import { FIELD_LIMITS } from '../fieldLimits';
import { flowConfig } from '../flow.config';
import { createMakeAClaimStep } from '../formStep';

import { getTranslationFunction } from '@modules/steps';
import { getStepUrl } from '@modules/steps/flow';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import { groundsNeedingReasons } from '@services/citizenPossessionClaim.interface';

const reasonUrl = (req: Request, ground: string) =>
  `${getStepUrl('ground-reason', flowConfig, req.res?.locals.validatedCase?.id)}?ground=${ground}`;

/** One page for each ground that needs a reason, in the order the claimant chose them. */
export const step: StepDefinition = createMakeAClaimStep({
  stepName: 'ground-reason',
  stepDir: __dirname,
  fields: [pageHeadingLongText('groundReason', { required: true, maxLength: FIELD_LIMITS.groundReason })],
  extendGetContent: req => {
    const grounds = groundsNeedingReasons(readClaim(req).grounds);
    const ground = groundForReasonOf(req, readClaim(req));
    const position = ground ? grounds.indexOf(ground) : -1;
    return {
      ground: ground ? getTranslationFunction(req, ['makeAClaim', 'common'])(`makeAClaim:grounds.${ground}`) : '',
      ...(position > 0 ? { backUrl: reasonUrl(req, grounds[position - 1]) } : {}),
    };
  },
  resolveRedirectAfterPost: async req => {
    const grounds = groundsNeedingReasons(readClaim(req).grounds);
    const ground = groundForReasonOf(req, readClaim(req));
    const next = ground ? grounds[grounds.indexOf(ground) + 1] : undefined;
    return next ? reasonUrl(req, next) : undefined;
  },
});
