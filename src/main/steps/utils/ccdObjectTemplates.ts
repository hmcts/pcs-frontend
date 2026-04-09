/**
 * Template objects for CCD complex types.
 *
 * When a step sends a nested object to CCD, the backend performs a deep merge
 * with the existing draft. Fields *absent* from the patch are preserved — so
 * stale values survive when a user changes their answer.
 *
 * To prevent this, every step that writes to a self-contained object (Address,
 * Party, PaymentAgreement) must spread the relevant template first, then
 * overlay its actual values. The template sets every field to null, ensuring
 * that fields the step does not explicitly set are wiped rather than silently
 * kept.
 *
 * NOTE: defendantResponses is a shared flat object whose fields are owned by
 * many different steps. There is no template for it — spreading a full template
 * there would wipe fields belonging to other steps. Instead, each step must be
 * explicit about the fields it sets (value or null to clear).
 *
 * These templates are derived from the PossessionClaimResponse interface in
 * ccdCase.interface.ts — keep them in sync when the interface changes.
 */

import type { Address } from '../../interfaces/ccdCase.interface';

/**
 * Address — used by correspondence-address step.
 * Note: address also has a backend REPLACE_FIELDS rule in DraftCaseJsonMerger,
 * but the template provides defence-in-depth on the frontend side.
 */
export const emptyAddress: Address = {
  AddressLine1: null,
  AddressLine2: null,
  AddressLine3: null,
  PostTown: null,
  County: null,
  PostCode: null,
  Country: null,
};

/**
 * Party — fields within defendantContactDetails.party that are written by
 * frontend steps (excludes addressKnown which is set by the backend only).
 */
export const emptyParty = {
  firstName: null,
  lastName: null,
  phoneNumber: null,
  emailAddress: null,
};

/**
 * PaymentAgreement — nested object within defendantResponses.
 */
export const emptyPaymentAgreement = {
  repaymentPlanAgreed: null,
  repaymentAgreedDetails: null,
};
