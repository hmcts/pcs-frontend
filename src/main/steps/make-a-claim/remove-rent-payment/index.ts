import type { Request } from 'express';

import { readClaim } from '../claimDraft';
import { rentPaymentToRemoveOf } from '../claimMapping';
import { formatClaimDate } from '../dates';
import { yesNoQuestion } from '../fieldBuilders';
import { flowConfig } from '../flow.config';
import { createMakeAClaimStep } from '../formStep';
import { formatPence } from '../rentHistory';

import { getStepUrl } from '@modules/steps/flow';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';

const rentStatementUrl = (req: Request) => getStepUrl('rent-statement', flowConfig, req.res?.locals.validatedCase?.id);

/** Asks before removing a payment from the rent statement. A link to a payment that has gone changes nothing. */
export const step: StepDefinition = createMakeAClaimStep({
  stepName: 'remove-rent-payment',
  stepDir: __dirname,
  interstitial: true,
  fields: [yesNoQuestion('confirmRemove')],
  redirectWhen: req => (rentPaymentToRemoveOf(req, readClaim(req)) === undefined ? rentStatementUrl(req) : undefined),
  extendGetContent: req => {
    const claim = readClaim(req);
    const row = claim.rentArrears?.rentHistoryTable?.[rentPaymentToRemoveOf(req, claim) ?? -1]?.value;
    return {
      amountPaid: formatPence(row?.amountPaid),
      datePaid: formatClaimDate(row?.datePaid, req),
      backUrl: rentStatementUrl(req),
      dashboardUrl: rentStatementUrl(req),
    };
  },
  resolveRedirectAfterPost: async req => rentStatementUrl(req),
});
