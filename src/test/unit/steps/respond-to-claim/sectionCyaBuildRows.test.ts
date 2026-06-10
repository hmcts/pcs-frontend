import type { Request } from 'express';
import type { TFunction } from 'i18next';

import { CcdCaseModel } from '../../../../main/services/ccdCaseData.model';
import { buildSectionCyaRows as buildUploadRows } from '../../../../main/steps/respond-to-claim/check-your-answers-documents/buildSectionCyaRows';
import {
  buildEOJRegularExpensesRows,
  buildEOJRegularIncomeRows,
  buildSectionCyaRows as buildIncomeRows,
} from '../../../../main/steps/respond-to-claim/check-your-answers-income-and-expenses/buildSectionCyaRows';
import { buildSectionCyaRows as buildPaymentsRows } from '../../../../main/steps/respond-to-claim/check-your-answers-payments-and-agreements/buildSectionCyaRows';
import { buildSectionCyaRows as buildPersonalRows } from '../../../../main/steps/respond-to-claim/check-your-answers-personal-details/buildSectionCyaRows';
import { buildSectionCyaRows as buildStartNowRows } from '../../../../main/steps/respond-to-claim/check-your-answers-start-now-and-details/buildSectionCyaRows';
import { buildSectionCyaRows as buildSituationRows } from '../../../../main/steps/respond-to-claim/check-your-answers-your-circumstances/buildSectionCyaRows';
import { buildSectionCyaRows as buildDisputeRows } from '../../../../main/steps/respond-to-claim/check-your-answers-your-response/buildSectionCyaRows';

// Characterisation tests — lock the current output of every section-CYA row builder
// before the P1/P2 refactor. Identity `t` so assertions can match translation keys.
const t = ((key: string) => key) as unknown as TFunction;

const reqWith = (validatedCase: CcdCaseModel | undefined): Request =>
  ({ res: { locals: { validatedCase } } }) as unknown as Request;

const model = (defendantResponses: Record<string, unknown>, extraData: Record<string, unknown> = {}): CcdCaseModel =>
  new CcdCaseModel({
    id: '1234123412341234',
    data: { possessionClaimResponse: { defendantResponses }, ...extraData },
  });

describe('section-CYA row builders — characterisation', () => {
  describe('start-now-and-details', () => {
    it('returns no rows when validatedCase is missing', () => {
      expect(buildStartNowRows(reqWith(undefined), t)).toEqual([]);
    });

    it('returns no rows when free legal advice is unanswered', () => {
      expect(buildStartNowRows(reqWith(model({})), t)).toEqual([]);
    });

    it('renders the free-legal-advice row when answered', () => {
      const rows = buildStartNowRows(reqWith(model({ freeLegalAdvice: 'YES' })), t);
      expect(rows).toHaveLength(1);
      expect(rows[0].key.text).toBe('rows.freeLegalAdvice.label');
      expect(rows[0].actions?.items[0].href).toBe(
        '/case/1234123412341234/respond-to-claim/free-legal-advice?edit=startNowAndDetails'
      );
    });
  });

  describe('personal-details', () => {
    it('returns no rows when validatedCase is missing', () => {
      expect(buildPersonalRows(reqWith(undefined), t)).toEqual([]);
    });

    it('renders date of birth and contact rows when answered', () => {
      const rows = buildPersonalRows(
        reqWith(
          model({
            dateOfBirth: '1990-01-01',
            contactByPhone: 'YES',
            defendantContactDetails: { party: { phoneNumber: '07123456789' } },
          })
        ),
        t
      );
      const keys = rows.map(r => r.key.text);
      expect(keys).toContain('rows.dateOfBirth.label');
      expect(keys).toContain('rows.contactByPhone.label');
    });

    it('contact-by-phone: preference row stands alone; phone number lives in the Contact details row', () => {
      const validatedCase = new CcdCaseModel({
        id: '1234123412341234',
        data: {
          possessionClaimResponse: {
            defendantResponses: { contactByPhone: 'YES' },
            defendantContactDetails: { party: { phoneNumber: '07123456789' } },
          },
        },
      });
      const rows = buildPersonalRows(reqWith(validatedCase), t);
      const questionRow = rows.find(r => r.key.text === 'rows.contactByPhone.label');
      const contactDetailsRow = rows.find(r => r.key.text === 'rows.contactDetails.label');
      // Preference row no longer groups a detail row underneath it.
      expect(questionRow?.classes).toBeUndefined();
      expect(contactDetailsRow?.value.html).toContain('<p class="govuk-body">07123456789</p>');
      // Phone-only: Change link targets the telephone step.
      expect(contactDetailsRow?.actions?.items[0].href).toContain(
        '/contact-preferences-telephone?edit=personalDetails'
      );
    });

    it('contact-by-email: preference row stands alone; email lives in the Contact details row', () => {
      const validatedCase = new CcdCaseModel({
        id: '1234123412341234',
        data: {
          possessionClaimResponse: {
            defendantResponses: { contactByEmail: 'YES' },
            defendantContactDetails: { party: { emailAddress: 'alice@example.com' } },
          },
        },
      });
      const rows = buildPersonalRows(reqWith(validatedCase), t);
      const questionRow = rows.find(r => r.key.text === 'rows.contactByEmailOrPost.label');
      const contactDetailsRow = rows.find(r => r.key.text === 'rows.contactDetails.label');
      expect(questionRow?.classes).toBeUndefined();
      expect(contactDetailsRow?.value.html).toContain('<p class="govuk-body">alice@example.com</p>');
      // Email present: Change link targets the email-or-post step.
      expect(contactDetailsRow?.actions?.items[0].href).toContain(
        '/contact-preferences-email-or-post?edit=personalDetails'
      );
    });

    it('contact details row: stacks phone and email as separate paragraphs when both are selected', () => {
      const validatedCase = new CcdCaseModel({
        id: '1234123412341234',
        data: {
          possessionClaimResponse: {
            defendantResponses: { contactByPhone: 'YES', contactByEmail: 'YES' },
            defendantContactDetails: { party: { phoneNumber: '07123456789', emailAddress: 'alice@example.com' } },
          },
        },
      });
      const row = buildPersonalRows(reqWith(validatedCase), t).find(r => r.key.text === 'rows.contactDetails.label');
      expect(row?.value.html).toBe('<p class="govuk-body">07123456789</p><p class="govuk-body">alice@example.com</p>');
    });

    it('contact details row: omitted when only post is selected (no phone/email values)', () => {
      const validatedCase = new CcdCaseModel({
        id: '1234123412341234',
        data: {
          possessionClaimResponse: { defendantResponses: { contactByPost: 'YES' } },
        },
      });
      const rows = buildPersonalRows(reqWith(validatedCase), t);
      expect(rows.some(r => r.key.text === 'rows.contactDetails.label')).toBe(false);
    });

    it('date-of-birth row: shows "No answer provided" when the optional DOB is left blank', () => {
      const row = buildPersonalRows(reqWith(model({})), t).find(r => r.key.text === 'rows.dateOfBirth.label');
      expect(row?.value).toEqual({ text: 'noAnswerProvided' });
    });

    it('name row: emits separate Q/A and corrected-name rows when user said "No" to claim-recorded name', () => {
      const validatedCase = new CcdCaseModel({
        id: '1234123412341234',
        data: {
          possessionClaimResponse: {
            defendantResponses: { defendantNameConfirmation: 'NO' },
            defendantContactDetails: { party: { firstName: 'Jane', lastName: 'Doe' } },
            claimantEnteredDefendantDetails: { firstName: 'John', lastName: 'Smith' },
          },
        },
      });
      const rows = buildPersonalRows(reqWith(validatedCase), t);
      const confirmation = rows.find(r => r.key.text === 'rows.defendantNameConfirmation.label');
      const correction = rows.find(r => r.key.text === 'rows.defendantName.label');
      expect(confirmation?.value).toEqual({ text: 'options.no' });
      expect(correction?.value).toEqual({ html: 'Jane Doe' });
    });

    it('name row: tolerates Pascal-case "Yes" echo from pcs-api (no missing-key fallthrough)', () => {
      const validatedCase = new CcdCaseModel({
        id: '1234123412341234',
        data: {
          possessionClaimResponse: {
            defendantResponses: { defendantNameConfirmation: 'Yes' },
            claimantEnteredDefendantDetails: { firstName: 'John', lastName: 'Smith' },
          },
        },
      });
      const row = buildPersonalRows(reqWith(validatedCase), t).find(
        r => r.key.text === 'rows.defendantNameConfirmation.label'
      );
      expect(row?.value).toEqual({ text: 'options.yes' });
    });

    it('name row: shows just "Yes" when user confirmed claim-recorded name', () => {
      const validatedCase = new CcdCaseModel({
        id: '1234123412341234',
        data: {
          possessionClaimResponse: {
            defendantResponses: { defendantNameConfirmation: 'YES' },
            claimantEnteredDefendantDetails: { firstName: 'John', lastName: 'Smith' },
          },
        },
      });
      const row = buildPersonalRows(reqWith(validatedCase), t).find(
        r => r.key.text === 'rows.defendantNameConfirmation.label'
      );
      expect(row?.value).toEqual({ text: 'options.yes' });
      // Change link carries a short subject for screen-reader link-nav (e.g. "Change name").
      expect(row?.actions?.items[0].visuallyHiddenText).toBe('rows.defendantNameConfirmation.changeHidden');
    });

    it('correspondence-address: shows Yes against the interpolated question when the citizen confirmed the claim-recorded address', () => {
      const validatedCase = new CcdCaseModel({
        id: '1234123412341234',
        data: {
          possessionClaimResponse: {
            defendantResponses: { correspondenceAddressConfirmation: 'YES' },
            claimantEnteredDefendantDetails: {
              addressKnown: 'YES',
              address: { AddressLine1: '1 Claim Street', PostCode: 'AB1 2CD' },
            },
          },
        },
      });
      const rows = buildPersonalRows(reqWith(validatedCase), t);
      // YES branch uses the interpolated `label` ("Is your correspondence address X?") with a Y/N value —
      // same shape as the defendant-name-confirmation row above.
      const addressRow = rows.find(r => r.key.text === 'rows.correspondenceAddressConfirmation.label');
      expect(addressRow?.value).toEqual({ text: 'options.yes' });
      expect(rows.some(r => r.key.text === 'rows.correspondenceAddressConfirmation.fallbackLabel')).toBe(false);
    });

    it('correspondence-address: shows the corrected address as one row when the citizen answered No', () => {
      const validatedCase = new CcdCaseModel({
        id: '1234123412341234',
        data: {
          possessionClaimResponse: {
            defendantResponses: { correspondenceAddressConfirmation: 'NO' },
            claimantEnteredDefendantDetails: {
              addressKnown: 'YES',
              address: { AddressLine1: '1 Claim Street', PostCode: 'AB1 2CD' },
            },
            defendantContactDetails: {
              party: {
                address: { AddressLine1: '99 New Road', PostTown: 'London', PostCode: 'XY1 9ZZ' },
              },
            },
          },
        },
      });
      const rows = buildPersonalRows(reqWith(validatedCase), t);
      const addressRow = rows.find(r => r.key.text === 'rows.correspondenceAddressConfirmation.fallbackLabel');
      // The corrected address, one part per line; no Y/N row.
      expect(addressRow?.value).toEqual({ html: '99 New Road<br>London<br>XY1 9ZZ' });
      expect(rows.some(r => r.key.text === 'rows.correspondenceAddressConfirmation.label')).toBe(false);
    });

    it('correspondence-address: shows the typed address as one row when the claim recorded no defendant address', () => {
      // Case 1777294706554860: claimant ticked "I don't know defendant's address" at filing,
      // the citizen typed their address on the NA page. Forged storage-level
      // correspondenceAddressConfirmation must not change what the CYA shows.
      const validatedCase = new CcdCaseModel({
        id: '1234123412341234',
        data: {
          propertyAddress: { AddressLine1: '1 Rse Way', PostCode: 'SW11 1PD' },
          possessionClaimResponse: {
            defendantResponses: { correspondenceAddressConfirmation: 'NO' },
            claimantEnteredDefendantDetails: { addressKnown: 'NO' },
            defendantContactDetails: {
              party: { address: { AddressLine1: '3 Wiltshire Close', PostCode: 'WA1 4DA' } },
            },
          },
        },
      });
      const rows = buildPersonalRows(reqWith(validatedCase), t);
      const addressRow = rows.find(r => r.key.text === 'rows.correspondenceAddressConfirmation.fallbackLabel');
      expect(addressRow?.value).toEqual({ html: '3 Wiltshire Close<br>WA1 4DA' });
      expect(rows.some(r => r.key.text === 'rows.correspondenceAddressConfirmation.label')).toBe(false);
    });
  });

  describe('dispute-and-tenancy', () => {
    it('returns no rows when validatedCase is missing', () => {
      expect(buildDisputeRows(reqWith(undefined), t)).toEqual([]);
    });

    it('renders tenancy-type and counterclaim rows from defendant responses', () => {
      const rows = buildDisputeRows(reqWith(model({ tenancyTypeConfirmation: 'YES', makeCounterClaim: 'NO' })), t);
      const keys = rows.map(r => r.key.text);
      expect(keys).toContain('rows.tenancyTypeCorrect.label');
      expect(keys).toContain('rows.makeCounterClaim.label');
    });

    it('tenancy-date row: "known" branch renders the confirmation row plus a grouped corrected-date row when answered No', () => {
      const rows = buildDisputeRows(
        reqWith(
          model(
            { tenancyStartDateConfirmation: 'NO', tenancyStartDate: '2023-01-01' },
            { tenancy_TenancyLicenceDate: '2023-01-01' }
          )
        ),
        t
      );
      const confirmRow = rows.find(r => r.key.text === 'rows.tenancyStartDate.confirm.label');
      const dateRow = rows.find(r => r.key.text === 'rows.tenancyStartDate.correctDate.label');
      expect(confirmRow?.value).toEqual({ text: 'options.no' });
      expect(confirmRow?.actions?.items[0].href).toContain('/tenancy-date-details?edit=disputeAndTenancy');
      expect(confirmRow?.classes).toContain('govuk-summary-list__row--no-border');
      expect(dateRow?.value).toEqual({ text: '1 January 2023' });
      expect(dateRow?.actions?.items[0].href).toContain('/tenancy-date-details?edit=disputeAndTenancy');
    });

    it('tenancy-date row: "unknown" branch links to tenancy-date-unknown and uses the entered label', () => {
      const rows = buildDisputeRows(reqWith(model({ tenancyStartDate: '2023-01-01' })), t);
      const row = rows.find(r => r.key.text === 'rows.tenancyStartDate.labelEntered');
      expect(row?.actions?.items[0].href).toContain('/tenancy-date-unknown?edit=disputeAndTenancy');
    });

    it('tenancy-date row: shows only the confirmation answer (Yes) with no corrected-date row', () => {
      const rows = buildDisputeRows(
        reqWith(model({ tenancyStartDateConfirmation: 'YES' }, { tenancy_TenancyLicenceDate: '2023-01-01' })),
        t
      );
      const confirmRow = rows.find(r => r.key.text === 'rows.tenancyStartDate.confirm.label');
      expect(confirmRow?.value).toEqual({ text: 'options.yes' });
      expect(rows.find(r => r.key.text === 'rows.tenancyStartDate.correctDate.label')).toBeUndefined();
    });

    it('tenancy-date row: shows "I\'m not sure" with no corrected-date row', () => {
      const rows = buildDisputeRows(
        reqWith(model({ tenancyStartDateConfirmation: 'NOT_SURE' }, { tenancy_TenancyLicenceDate: '2023-01-01' })),
        t
      );
      const confirmRow = rows.find(r => r.key.text === 'rows.tenancyStartDate.confirm.label');
      expect(confirmRow?.value).toEqual({ text: 'options.imNotSure' });
      expect(rows.find(r => r.key.text === 'rows.tenancyStartDate.correctDate.label')).toBeUndefined();
    });

    it('tenancy-date row: "No" with the optional corrected date left blank shows "No answer provided"', () => {
      const rows = buildDisputeRows(
        reqWith(model({ tenancyStartDateConfirmation: 'NO' }, { tenancy_TenancyLicenceDate: '2023-01-01' })),
        t
      );
      expect(rows.find(r => r.key.text === 'rows.tenancyStartDate.confirm.label')?.value).toEqual({
        text: 'options.no',
      });
      expect(rows.find(r => r.key.text === 'rows.tenancyStartDate.correctDate.label')?.value).toEqual({
        text: 'noAnswerProvided',
      });
    });

    it('notice-date row: links to "not-provided" step when the claim has no notice date', () => {
      const rows = buildDisputeRows(
        reqWith(model({ possessionNoticeReceived: 'YES', noticeReceivedDate: '2025-05-20' })),
        t
      );
      const row = rows.find(r => r.key.text === 'rows.noticeReceivedDate.label');
      expect(row?.actions?.items[0].href).toContain('confirmation-of-notice-date-when-not-provided');
    });

    it('notice-date row: links to "provided" step when the claim has a notice date', () => {
      const rows = buildDisputeRows(
        reqWith(
          model(
            { possessionNoticeReceived: 'YES', noticeReceivedDate: '2025-05-20' },
            { notice_NoticePostedDate: '2025-05-01' }
          )
        ),
        t
      );
      const row = rows.find(r => r.key.text === 'rows.noticeReceivedDate.label');
      expect(row?.actions?.items[0].href).toContain('confirmation-of-notice-date-when-provided');
    });

    it('tenancy-date row: "unknown" branch shows "No answer provided" when the optional date is blank', () => {
      const rows = buildDisputeRows(reqWith(model({})), t);
      const row = rows.find(r => r.key.text === 'rows.tenancyStartDate.labelEntered');
      expect(row?.value).toEqual({ text: 'noAnswerProvided' });
      expect(row?.actions?.items[0].href).toContain('/tenancy-date-unknown?edit=disputeAndTenancy');
    });

    it('notice-date row: "not-provided" branch shows "No answer provided" when the optional date is blank', () => {
      const rows = buildDisputeRows(reqWith(model({ possessionNoticeReceived: 'YES' })), t);
      const row = rows.find(r => r.key.text === 'rows.noticeReceivedDate.label');
      expect(row?.value).toEqual({ text: 'noAnswerProvided' });
      expect(row?.actions?.items[0].href).toContain('confirmation-of-notice-date-when-not-provided');
    });

    it('notice-date row: "provided" branch shows "No answer provided" when the optional date is blank', () => {
      const rows = buildDisputeRows(
        reqWith(model({ possessionNoticeReceived: 'YES' }, { notice_NoticePostedDate: '2025-05-01' })),
        t
      );
      const row = rows.find(r => r.key.text === 'rows.noticeReceivedDate.label');
      expect(row?.value).toEqual({ text: 'noAnswerProvided' });
      expect(row?.actions?.items[0].href).toContain('confirmation-of-notice-date-when-provided');
    });

    it('notice-date row: omitted when the citizen is not on a notice-date branch', () => {
      const rows = buildDisputeRows(reqWith(model({})), t);
      expect(rows.some(r => r.key.text === 'rows.noticeReceivedDate.label')).toBe(false);
    });

    it('counterclaim applied-for-HWF row: renders Y/N and links to the HWF question step', () => {
      const rows = buildDisputeRows(
        reqWith(
          model({
            makeCounterClaim: 'YES',
            counterClaim: { claimType: 'PAYMENT_OR_COMPENSATION', appliedForHwf: 'NO' },
          })
        ),
        t
      );
      const row = rows.find(r => r.key.text === 'rows.counterClaimAppliedForHwf.label');
      expect(row?.value).toEqual({ text: 'options.no' });
      expect(row?.actions?.items[0].href).toContain('counter-claim-have-you-applied-for-help');
    });

    it('counterclaim HWF reference row: rendered as the detail when applied-for-HWF is YES', () => {
      const rows = buildDisputeRows(
        reqWith(
          model({
            makeCounterClaim: 'YES',
            counterClaim: {
              claimType: 'OTHER',
              appliedForHwf: 'YES',
              hwfReferenceNumber: 'HWF-ABC-123',
            },
          })
        ),
        t
      );
      const ref = rows.find(r => r.key.text === 'rows.counterClaimHwfReference.label');
      expect(ref?.value).toEqual({ text: 'HWF-ABC-123' });
      expect(ref?.actions?.items[0].href).toContain('counter-claim-have-you-applied-for-help');
    });

    it('counterclaim HWF reference row: omitted when applied-for-HWF is NO', () => {
      const rows = buildDisputeRows(
        reqWith(
          model({
            makeCounterClaim: 'YES',
            counterClaim: { claimType: 'OTHER', appliedForHwf: 'NO', hwfReferenceNumber: 'stale-ref' },
          })
        ),
        t
      );
      expect(rows.some(r => r.key.text === 'rows.counterClaimHwfReference.label')).toBe(false);
    });

    it('counterclaim applied-for-HWF row: omitted when there is no counter-claim', () => {
      const rows = buildDisputeRows(reqWith(model({ makeCounterClaim: 'NO' })), t);
      expect(rows.some(r => r.key.text === 'rows.counterClaimAppliedForHwf.label')).toBe(false);
    });

    it('counterclaim-about rows: render counterClaimFor and counterClaimReasons as long-text rows', () => {
      const rows = buildDisputeRows(
        reqWith(
          model({
            makeCounterClaim: 'YES',
            counterClaim: {
              claimType: 'OTHER',
              counterClaimFor: 'Damage to property',
              counterClaimReasons: 'Repairs were never completed',
            },
          })
        ),
        t
      );
      const forRow = rows.find(r => r.key.text === 'rows.counterClaimFor.label');
      const reasonsRow = rows.find(r => r.key.text === 'rows.counterClaimReasons.label');
      expect(forRow?.value.html).toContain('Damage to property');
      expect(reasonsRow?.value.html).toContain('Repairs were never completed');
      expect(forRow?.actions?.items[0].href).toContain('counter-claim-about');
      expect(reasonsRow?.actions?.items[0].href).toContain('counter-claim-about');
    });

    it('counterclaim-about rows: omitted when the fields are absent', () => {
      const rows = buildDisputeRows(
        reqWith(model({ makeCounterClaim: 'YES', counterClaim: { claimType: 'OTHER' } })),
        t
      );
      expect(rows.some(r => r.key.text === 'rows.counterClaimFor.label')).toBe(false);
      expect(rows.some(r => r.key.text === 'rows.counterClaimReasons.label')).toBe(false);
    });

    it('counterclaim-against row: renders party names and links to counter-claim-against-whom', () => {
      const rows = buildDisputeRows(
        reqWith(
          model({
            makeCounterClaim: 'YES',
            counterClaim: {
              claimType: 'OTHER',
              counterClaimAgainst: [
                { id: 'p1', value: { firstName: 'Jane', lastName: 'Doe' } },
                { id: 'p2', value: { orgName: 'Acme Lettings' } },
              ],
            },
          })
        ),
        t
      );
      const row = rows.find(r => r.key.text === 'rows.counterClaimAgainst.label');
      expect(row?.value.html).toContain('Jane Doe');
      expect(row?.value.html).toContain('Acme Lettings');
      expect(row?.actions?.items[0].href).toContain('counter-claim-against-whom');
    });

    it('counterclaim-against row: omitted when no parties are selected', () => {
      const rows = buildDisputeRows(
        reqWith(model({ makeCounterClaim: 'YES', counterClaim: { claimType: 'OTHER', counterClaimAgainst: [] } })),
        t
      );
      expect(rows.some(r => r.key.text === 'rows.counterClaimAgainst.label')).toBe(false);
    });

    it('counter-claim-order-other-than-sum rows: render otherOrderRequestDetails and otherOrderRequestFacts as long-text rows', () => {
      const rows = buildDisputeRows(
        reqWith(
          model({
            makeCounterClaim: 'YES',
            counterClaim: {
              claimType: 'SOMETHING_ELSE',
              otherOrderRequestDetails: 'Repairs to be done within 28 days',
              otherOrderRequestFacts: 'The boiler has been broken since January',
            },
          })
        ),
        t
      );
      const details = rows.find(r => r.key.text === 'rows.otherOrderRequestDetails.label');
      const facts = rows.find(r => r.key.text === 'rows.otherOrderRequestFacts.label');
      expect(details?.value.html).toContain('Repairs to be done within 28 days');
      expect(facts?.value.html).toContain('The boiler has been broken since January');
      expect(details?.actions?.items[0].href).toContain('counter-claim-order-other-than-sum');
      expect(facts?.actions?.items[0].href).toContain('counter-claim-order-other-than-sum');
    });

    it('counter-claim-order-other-than-sum rows: omitted when the fields are absent', () => {
      const rows = buildDisputeRows(
        reqWith(model({ makeCounterClaim: 'YES', counterClaim: { claimType: 'SOMETHING_ELSE' } })),
        t
      );
      expect(rows.some(r => r.key.text === 'rows.otherOrderRequestDetails.label')).toBe(false);
      expect(rows.some(r => r.key.text === 'rows.otherOrderRequestFacts.label')).toBe(false);
    });

    it('counterclaim want-to-upload-files row: omitted when unanswered', () => {
      const rows = buildDisputeRows(
        reqWith(model({ makeCounterClaim: 'YES', counterClaim: { claimType: 'OTHER' } })),
        t
      );
      expect(rows.some(r => r.key.text === 'rows.counterClaimWantToUploadFiles.label')).toBe(false);
      expect(rows.some(r => r.key.text === 'rows.counterClaimDocuments.label')).toBe(false);
    });

    it('counterclaim want-to-upload-files row: renders Y/N and links to the upload question step', () => {
      const rows = buildDisputeRows(
        reqWith(
          model({
            makeCounterClaim: 'YES',
            counterClaim: { claimType: 'OTHER' },
            counterClaimWantToUploadFiles: 'YES',
          })
        ),
        t
      );
      const row = rows.find(r => r.key.text === 'rows.counterClaimWantToUploadFiles.label');
      expect(row?.value).toEqual({ text: 'options.yes' });
      expect(row?.actions?.items[0].href).toContain('counter-claim-do-you-want-to-upload-files');
    });

    it('counterclaim documents row: omitted when upload was not wanted', () => {
      const rows = buildDisputeRows(
        reqWith(
          model({
            makeCounterClaim: 'YES',
            counterClaim: { claimType: 'OTHER' },
            counterClaimWantToUploadFiles: 'NO',
          })
        ),
        t
      );
      expect(rows.some(r => r.key.text === 'rows.counterClaimDocuments.label')).toBe(false);
    });

    it('counterclaim documents row: shows "none" when upload was wanted but no files are present', () => {
      const rows = buildDisputeRows(
        reqWith(
          model({
            makeCounterClaim: 'YES',
            counterClaim: { claimType: 'OTHER' },
            counterClaimWantToUploadFiles: 'YES',
            counterClaimDocuments: [],
          })
        ),
        t
      );
      const row = rows.find(r => r.key.text === 'rows.counterClaimDocuments.label');
      expect(row?.value).toEqual({ text: 'rows.counterClaimDocuments.none' });
      expect(row?.actions?.items[0].href).toContain('counter-claim-upload-files');
      expect(row?.actions?.items[0].visuallyHiddenText).toBeTruthy();
    });

    it('counterclaim documents row: lists uploaded document filenames', () => {
      const rows = buildDisputeRows(
        reqWith(
          model({
            makeCounterClaim: 'YES',
            counterClaim: { claimType: 'OTHER' },
            counterClaimWantToUploadFiles: 'YES',
            counterClaimDocuments: [
              { id: 'a', value: { document: { document_filename: 'evidence.pdf' } } },
              { id: 'b', value: { document: { document_filename: 'letter.docx' } } },
            ],
          })
        ),
        t
      );
      const row = rows.find(r => r.key.text === 'rows.counterClaimDocuments.label');
      expect(row?.value.html).toContain('evidence.pdf');
      expect(row?.value.html).toContain('letter.docx');
      expect(row?.actions?.items[0].href).toContain('counter-claim-upload-files');
      expect(row?.actions?.items[0].visuallyHiddenText).toBeTruthy();
    });
  });

  describe('payments', () => {
    it('returns no rows when validatedCase is missing', () => {
      expect(buildPaymentsRows(reqWith(undefined), t)).toEqual([]);
    });

    it('renders repayments-made and instalment rows', () => {
      const rows = buildPaymentsRows(
        reqWith(model({ paymentAgreement: { anyPaymentsMade: 'YES', repayArrearsInstalments: 'NO' } })),
        t
      );
      const keys = rows.map(r => r.key.text);
      expect(keys).toContain('rows.anyPaymentsMade.label');
      expect(keys).toContain('rows.repayArrearsInstalments.label');
    });

    it('normalises Pascal-case backend values (P1 casing fix)', () => {
      const rows = buildPaymentsRows(reqWith(model({ paymentAgreement: { anyPaymentsMade: 'Yes' } })), t);
      const row = rows.find(r => r.key.text === 'rows.anyPaymentsMade.label');
      expect(row?.value).toEqual({ text: 'options.yes' });
    });

    it('renders instalment amount + frequency as two peer rows when instalments offered', () => {
      const rows = buildPaymentsRows(
        reqWith(
          model({
            paymentAgreement: {
              repayArrearsInstalments: 'YES',
              additionalRentContribution: '14800',
              additionalContributionFrequency: 'every2Weeks',
            },
          })
        ),
        t
      );
      const amountRow = rows.find(r => r.key.text === 'rows.installmentAmount.label');
      const frequencyRow = rows.find(r => r.key.text === 'rows.installmentFrequency.label');
      expect(amountRow?.value).toEqual({ text: '£148.00' });
      expect(frequencyRow?.value).toEqual({ text: 'rows.installmentFrequency.frequencies.every2Weeks' });
      // Each row carries its own Change link back to the same step page.
      expect(amountRow?.actions?.items[0].href).toContain('how-much-afford-to-pay');
      expect(frequencyRow?.actions?.items[0].href).toContain('how-much-afford-to-pay');
    });

    it('omits instalment rows when instalments not offered', () => {
      const rows = buildPaymentsRows(reqWith(model({ paymentAgreement: { repayArrearsInstalments: 'NO' } })), t);
      expect(rows.some(r => r.key.text === 'rows.installmentAmount.label')).toBe(false);
      expect(rows.some(r => r.key.text === 'rows.installmentFrequency.label')).toBe(false);
    });
  });

  describe('situation-and-circumstances', () => {
    it('returns no rows when validatedCase is missing', () => {
      expect(buildSituationRows(reqWith(undefined), t)).toEqual([]);
    });

    it('returns no rows when no household circumstances are answered', () => {
      expect(buildSituationRows(reqWith(model({})), t)).toEqual([]);
    });

    it('renders a row per answered household-circumstances question', () => {
      const rows = buildSituationRows(
        reqWith(model({ householdCircumstances: { dependantChildren: 'NO', exceptionalHardship: 'NO' } })),
        t
      );
      const keys = rows.map(r => r.key.text);
      expect(keys).toContain('rows.dependantChildren.label');
      expect(keys).toContain('rows.exceptionalHardship.label');
    });

    it('move-in-date row: shows "No answer provided" when alternative accommodation is "yes" and the date is blank', () => {
      const rows = buildSituationRows(
        reqWith(model({ householdCircumstances: { alternativeAccommodation: 'YES' } })),
        t
      );
      const row = rows.find(r => r.key.text === 'rows.alternativeAccommodationDate.label');
      expect(row?.value).toEqual({ text: 'noAnswerProvided' });
    });

    it('move-in-date row: omitted when alternative accommodation is "no"', () => {
      const rows = buildSituationRows(
        reqWith(model({ householdCircumstances: { alternativeAccommodation: 'NO' } })),
        t
      );
      expect(rows.some(r => r.key.text === 'rows.alternativeAccommodationDate.label')).toBe(false);
    });
  });

  describe('income-and-expenditure', () => {
    it('returns no rows when validatedCase is missing', () => {
      expect(buildIncomeRows(reqWith(undefined), t)).toEqual([]);
    });

    it('shows only the gate row when finance details were declined', () => {
      const rows = buildIncomeRows(reqWith(model({ householdCircumstances: { shareIncomeExpenseDetails: 'NO' } })), t);
      expect(rows.map(r => r.key.text)).toEqual(['rows.shareIncomeExpenseDetails.label']);
    });

    it('shows income/expenses rows as "No answer provided" when finance details were provided but left empty', () => {
      const rows = buildIncomeRows(reqWith(model({ householdCircumstances: { shareIncomeExpenseDetails: 'YES' } })), t);
      const income = rows.find(r => r.key.text === 'rows.regularIncome.label');
      const expenses = rows.find(r => r.key.text === 'rows.regularExpenses.label');
      expect(income?.value).toEqual({ text: 'noAnswerProvided' });
      expect(expenses?.value).toEqual({ text: 'noAnswerProvided' });
    });

    it('renders other-considerations even when finance details were declined', () => {
      const rows = buildIncomeRows(
        reqWith(model({ householdCircumstances: { shareIncomeExpenseDetails: 'NO' }, otherConsiderations: 'NO' })),
        t
      );
      expect(rows.map(r => r.key.text)).toContain('rows.otherConsiderations.label');
    });
  });

  describe('upload-files', () => {
    it('returns no rows when validatedCase is missing', () => {
      expect(buildUploadRows(reqWith(undefined), t)).toEqual([]);
    });

    it('shows "none" when no documents are uploaded', () => {
      const rows = buildUploadRows(reqWith(model({})), t);
      expect(rows).toHaveLength(1);
      expect(rows[0].key.text).toBe('rows.uploadedDocuments.label');
      expect(rows[0].value).toEqual({ text: 'rows.uploadedDocuments.none' });
      // Screen reader needs context on every state.
      expect(rows[0].actions?.items[0].visuallyHiddenText).toBeTruthy();
    });

    it('lists uploaded document filenames', () => {
      const rows = buildUploadRows(
        reqWith(
          model({
            defendantDocuments: [
              { id: 'a', value: { document: { document_filename: 'evidence.pdf' } } },
              { id: 'b', value: { document: { document_filename: 'letter.docx' } } },
            ],
          })
        ),
        t
      );
      expect(rows[0].key.text).toBe('rows.uploadedDocuments.label');
      expect(rows[0].value.html).toContain('evidence.pdf');
      expect(rows[0].value.html).toContain('letter.docx');
      expect(rows[0].actions?.items[0].visuallyHiddenText).toBeTruthy();
    });
  });

  describe('EOJ — buildEOJRegularIncomeRows', () => {
    it('returns no rows when validatedCase is missing', () => {
      expect(buildEOJRegularIncomeRows(reqWith(undefined), t)).toEqual([]);
    });

    it('returns no rows when shareIncomeExpenseDetails is not YES', () => {
      expect(
        buildEOJRegularIncomeRows(reqWith(model({ householdCircumstances: { shareIncomeExpenseDetails: 'NO' } })), t)
      ).toEqual([]);
    });

    it('shows header with noAnswerProvided when opted in but no income selected', () => {
      const rows = buildEOJRegularIncomeRows(
        reqWith(model({ householdCircumstances: { shareIncomeExpenseDetails: 'YES' } })),
        t
      );
      expect(rows).toHaveLength(1);
      expect(rows[0].key.text).toBe('rows.regularIncome.label');
      expect(rows[0].value).toEqual({ text: 'noAnswerProvided' });
      expect(rows[0].classes).toBe('govuk-summary-list__row--no-border');
    });

    it('shows header and a sub-row per selected income source, all without borders', () => {
      const rows = buildEOJRegularIncomeRows(
        reqWith(
          model({
            householdCircumstances: {
              shareIncomeExpenseDetails: 'YES',
              incomeFromJobs: 'YES',
              incomeFromJobsAmount: '150000',
              incomeFromJobsFrequency: 'MONTHLY',
              pension: 'YES',
              pensionAmount: '50000',
              pensionFrequency: 'WEEKLY',
            },
          })
        ),
        t
      );
      expect(rows).toHaveLength(3);
      expect(rows[0].value).toEqual({});
      expect(rows.every(r => r.classes === 'govuk-summary-list__row--no-border')).toBe(true);
      expect(rows.slice(1).every(r => r.key.classes === 'govuk-!-font-weight-regular')).toBe(true);
    });

    it('includes moneyFromElsewhere as a sub-row when details provided', () => {
      const rows = buildEOJRegularIncomeRows(
        reqWith(
          model({
            householdCircumstances: {
              shareIncomeExpenseDetails: 'YES',
              moneyFromElsewhere: 'YES',
              moneyFromElsewhereDetails: 'Child maintenance',
            },
          })
        ),
        t
      );
      expect(rows).toHaveLength(2);
      expect(rows[1].key.text).toBe('rows.regularIncome.options.moneyFromElsewhere');
      expect(rows[1].value).toEqual({ html: 'Child maintenance' });
    });
  });

  describe('EOJ — buildEOJRegularExpensesRows', () => {
    it('returns no rows when validatedCase is missing', () => {
      expect(buildEOJRegularExpensesRows(reqWith(undefined), t)).toEqual([]);
    });

    it('returns no rows when shareIncomeExpenseDetails is not YES', () => {
      expect(
        buildEOJRegularExpensesRows(reqWith(model({ householdCircumstances: { shareIncomeExpenseDetails: 'NO' } })), t)
      ).toEqual([]);
    });

    it('shows header with noAnswerProvided when opted in but no expenses selected', () => {
      const rows = buildEOJRegularExpensesRows(
        reqWith(model({ householdCircumstances: { shareIncomeExpenseDetails: 'YES' } })),
        t
      );
      expect(rows).toHaveLength(1);
      expect(rows[0].key.text).toBe('rows.regularExpenses.label');
      expect(rows[0].value).toEqual({ text: 'noAnswerProvided' });
      expect(rows[0].classes).toBe('govuk-summary-list__row--no-border');
    });

    it('shows header and a sub-row per selected expense, all without borders', () => {
      const rows = buildEOJRegularExpensesRows(
        reqWith(
          model({
            householdCircumstances: {
              shareIncomeExpenseDetails: 'YES',
              loanPayments: { applies: 'YES', amount: '110000', frequency: 'WEEKLY' },
              mobilePhone: { applies: 'YES', amount: '2000', frequency: 'MONTHLY' },
            },
          })
        ),
        t
      );
      expect(rows).toHaveLength(3);
      expect(rows[0].value).toEqual({});
      expect(rows.every(r => r.classes === 'govuk-summary-list__row--no-border')).toBe(true);
      expect(rows.slice(1).every(r => r.key.classes === 'govuk-!-font-weight-regular')).toBe(true);
    });
  });
});
