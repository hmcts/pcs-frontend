import type { Request } from 'express';

function getCaseReference(req: Request): string | undefined {
  const fromParams = req.params?.caseReference;
  if (typeof fromParams === 'string' && fromParams.length > 0) {
    return fromParams;
  }
  const fromValidatedCase = req.res?.locals?.validatedCase?.id;
  return typeof fromValidatedCase === 'string' && fromValidatedCase.length > 0 ? fromValidatedCase : undefined;
}

export function setRegularIncomeUcUnticked(req: Request, unticked: boolean): void {
  const caseReference = getCaseReference(req);
  if (!caseReference) {
    return;
  }
  if (!req.session.respondToClaimCaseOverrides) {
    req.session.respondToClaimCaseOverrides = {};
  }
  const overrides = (req.session.respondToClaimCaseOverrides[caseReference] ??= {});
  if (unticked) {
    overrides.regularIncomeUcUnticked = true;
  } else {
    delete overrides.regularIncomeUcUnticked;
  }
}

export function isRegularIncomeUcUnticked(req: Request): boolean {
  const caseReference = getCaseReference(req);
  if (!caseReference) {
    return false;
  }
  return req.session.respondToClaimCaseOverrides?.[caseReference]?.regularIncomeUcUnticked === true;
}
