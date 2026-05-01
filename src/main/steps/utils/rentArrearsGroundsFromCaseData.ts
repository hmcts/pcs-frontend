import type { CcdCaseData } from '@services/ccdCase.interface';

function isYesRentArrearsFlag(value: string | undefined): boolean {
  return value?.toUpperCase() === 'YES';
}

function hasRentArrearsInIntroOrWales(caseData: CcdCaseData | undefined): boolean {
  const intro = (caseData?.introGrounds_IntroductoryDemotedOrOtherGrounds ?? []).map(ground =>
    String(ground).toUpperCase()
  );
  if (intro.includes('RENT_ARREARS')) {
    return true;
  }

  const welsh = (caseData?.secureGroundsWales_DiscretionaryGrounds ?? []).map(ground => String(ground).toUpperCase());
  return welsh.some(code => code.includes('RENT_ARREARS'));
}

/**
 * When `claimGroundSummaries` is absent or empty, infers "only rent arrears" from intro/demoted and Wales codes.
 * Intro: every selected code must be exactly `RENT_ARREARS`.
 * Wales discretionary: every code must contain `RENT_ARREARS` (e.g. `RENT_ARREARS_S157`).
 */
function onlyRentArrearsFromIntroOrWales(caseData: CcdCaseData | undefined): boolean {
  const intro = caseData?.introGrounds_IntroductoryDemotedOrOtherGrounds ?? [];
  const welsh = caseData?.secureGroundsWales_DiscretionaryGrounds ?? [];

  if (intro.length === 0 && welsh.length === 0) {
    return false;
  }

  const introOnlyRentArrears =
    intro.length > 0 && intro.every(ground => String(ground).toUpperCase() === 'RENT_ARREARS');

  const walesOnlyRentArrears =
    welsh.length > 0 && welsh.every(ground => String(ground).toUpperCase().includes('RENT_ARREARS'));

  if (intro.length > 0 && welsh.length > 0) {
    return introOnlyRentArrears && walesOnlyRentArrears;
  }
  if (intro.length > 0) {
    return introOnlyRentArrears;
  }
  return walesOnlyRentArrears;
}

/**
 * True when the claim has at least one rent-arrears ground, using the same CCD sources as the citizen journey.
 * Prefer `claimGroundSummaries` when present; otherwise England intro/demoted lists and Wales discretionary codes.
 */
export function hasAnyRentArrearsInCaseData(caseData: CcdCaseData | undefined): boolean {
  const claimGroundSummaries = caseData?.claimGroundSummaries;
  if (Array.isArray(claimGroundSummaries) && claimGroundSummaries.length > 0) {
    return claimGroundSummaries.some(ground => isYesRentArrearsFlag(ground?.value?.isRentArrears));
  }
  return hasRentArrearsInIntroOrWales(caseData);
}

/**
 * True when every claim ground is rent-arrears. When `claimGroundSummaries` is absent or empty, uses intro and Wales
 * fallbacks (see {@link onlyRentArrearsFromIntroOrWales}).
 */
export function hasOnlyRentArrearsInCaseData(caseData: CcdCaseData | undefined): boolean {
  const claimGroundSummaries = caseData?.claimGroundSummaries;
  if (Array.isArray(claimGroundSummaries) && claimGroundSummaries.length > 0) {
    return claimGroundSummaries.every(ground => isYesRentArrearsFlag(ground?.value?.isRentArrears));
  }
  return onlyRentArrearsFromIntroOrWales(caseData);
}
