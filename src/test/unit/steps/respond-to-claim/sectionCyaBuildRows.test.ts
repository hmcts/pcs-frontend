import type { Request } from 'express';
import type { TFunction } from 'i18next';

import { CcdCaseModel } from '../../../../main/services/ccdCaseData.model';
import { buildSectionCyaRows as buildUploadRows } from '../../../../main/steps/respond-to-claim/check-your-answers-documents/buildSectionCyaRows';
import { buildSectionCyaRows as buildIncomeRows } from '../../../../main/steps/respond-to-claim/check-your-answers-income-and-expenses/buildSectionCyaRows';
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
      expect(contactDetailsRow?.actions?.items[0].visuallyHiddenText).toBe('rows.contactDetails.changeHidden');
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
    });

    it('correspondence-address: shows the confirmed claimant address as one row when the citizen answered Yes', () => {
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
      const addressRow = rows.find(r => r.key.text === 'rows.correspondenceAddressConfirmation.fallbackLabel');
      // The confirmed address shows as one multi-line row — no "is it correct?" Y/N row.
      expect(addressRow?.value).toEqual({ html: '1 Claim Street<br>AB1 2CD' });
      expect(rows.some(r => r.key.text === 'rows.correspondenceAddressConfirmation.label')).toBe(false);
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

    it('tenancy-date row: "known" branch links to tenancy-date-details', () => {
      const rows = buildDisputeRows(
        reqWith(
          model(
            { tenancyStartDateConfirmation: 'NO', tenancyStartDate: '2023-01-01' },
            { tenancy_TenancyLicenceDate: '2023-01-01' }
          )
        ),
        t
      );
      const row = rows.find(r => r.key.text === 'rows.tenancyStartDate.label');
      expect(row?.actions?.items[0].href).toContain('/tenancy-date-details?edit=disputeAndTenancy');
    });

    it('tenancy-date row: "unknown" branch links to tenancy-date-unknown', () => {
      const rows = buildDisputeRows(reqWith(model({ tenancyStartDate: '2023-01-01' })), t);
      const row = rows.find(r => r.key.text === 'rows.tenancyStartDate.label');
      expect(row?.actions?.items[0].href).toContain('/tenancy-date-unknown?edit=disputeAndTenancy');
    });

    it('tenancy-date row: shows the confirmation answer when no date entered', () => {
      const rows = buildDisputeRows(
        reqWith(model({ tenancyStartDateConfirmation: 'YES' }, { tenancy_TenancyLicenceDate: '2023-01-01' })),
        t
      );
      const row = rows.find(r => r.key.text === 'rows.tenancyStartDate.label');
      expect(row?.value).toEqual({ text: 'options.yes' });
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
      const row = rows.find(r => r.key.text === 'rows.tenancyStartDate.label');
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
      expect(rows[0].value).toEqual({ text: 'rows.uploadedDocuments.none' });
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
      expect(rows[0].value.html).toContain('evidence.pdf');
      expect(rows[0].value.html).toContain('letter.docx');
    });
  });
});
