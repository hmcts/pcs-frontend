import type { Request } from 'express';

import type { CitizenPossessionClaim } from '../../../../main/services/citizenPossessionClaim.interface';
import { claimMappings, removeDefendant, removeLedgerEntry } from '../../../../main/steps/make-a-claim/claimMapping';

const PROPERTY = { AddressLine1: '15 Garden Drive', PostTown: 'Luton', PostCode: 'LU1 1AB' };

function request(
  query: Record<string, string> = {},
  rentHistoryDesign = 'ledger',
  citizenPossessionClaim: CitizenPossessionClaim = {}
): Request {
  return {
    query,
    session: { user: { email: 'landlord@example.test' } },
    res: {
      locals: { rentHistoryDesign, validatedCase: { data: { propertyAddress: PROPERTY, citizenPossessionClaim } } },
    },
  } as unknown as Request;
}

/** Saves a page's answers onto a claim, then reads them back for the page, as a returning claimant would see them. */
function roundTrip(step: string, body: Record<string, unknown>, claim: CitizenPossessionClaim = {}, req = request()) {
  const mapping = claimMappings[step];
  const saved = structuredClone(claim);
  mapping.fromForm!(saved, body, req);
  return {
    saved,
    form: mapping.toForm ? mapping.toForm(saved, req) : undefined,
    answered: mapping.isAnswered?.(saved, req),
  };
}

describe('claim mappings', () => {
  it('saves the claimant type and reads it back', () => {
    const { saved, form, answered } = roundTrip('individual-or-organisation', {
      individualOrOrganisation: 'INDIVIDUAL',
    });
    expect(saved).toEqual({ claimant: { individualOrOrganisation: 'INDIVIDUAL' } });
    expect(form).toEqual({ individualOrOrganisation: 'INDIVIDUAL' });
    expect(answered).toBe(true);
  });

  it('ignores a claimant type it does not know', () => {
    expect(roundTrip('individual-or-organisation', { individualOrOrganisation: 'TRUST' }).saved).toEqual({
      claimant: { individualOrOrganisation: undefined },
    });
  });

  it('keeps the other claimant answers when one page changes', () => {
    const { saved } = roundTrip(
      'claimant-name',
      { firstName: ' Billy ', lastName: 'Wright' },
      {
        claimant: { individualOrOrganisation: 'INDIVIDUAL', phoneNumber: '0123' },
      }
    );
    expect(saved.claimant).toEqual({
      individualOrOrganisation: 'INDIVIDUAL',
      phoneNumber: '0123',
      firstName: 'Billy',
      lastName: 'Wright',
    });
  });

  it('saves an address from the postcode finder fields', () => {
    const { saved, form } = roundTrip('claimant-address', {
      'claimant-addressLine1': '12 High Street',
      'claimant-addressLine2': '',
      'claimant-town': 'London',
      'claimant-postcode': 'nw1 1aa',
    });
    expect(saved.claimant?.address).toEqual({
      AddressLine1: '12 High Street',
      PostTown: 'London',
      PostCode: 'NW1 1AA',
    });
    expect(form).toEqual({
      'claimant-addressLine1': '12 High Street',
      'claimant-addressLine2': '',
      'claimant-town': 'London',
      'claimant-county': '',
      'claimant-postcode': 'NW1 1AA',
    });
  });

  it('uses the account email when the claimant wants updates there, and their own otherwise', () => {
    expect(roundTrip('claimant-email', { useAccountEmail: 'yes' })).toMatchObject({
      saved: { claimant: { contactByEmail: 'YES', emailAddress: 'landlord@example.test' } },
      form: { useAccountEmail: 'yes' },
    });
    expect(
      roundTrip('claimant-email', { useAccountEmail: 'no', 'useAccountEmail.emailAddress': 'other@example.test' })
    ).toMatchObject({
      saved: { claimant: { contactByEmail: 'NO', emailAddress: 'other@example.test' } },
      form: { useAccountEmail: 'no', 'useAccountEmail.emailAddress': 'other@example.test' },
    });
  });

  it('keeps a text message number only when it differs from the phone number', () => {
    const phone: CitizenPossessionClaim = { claimant: { phoneNumber: '07700900982' } };
    expect(
      roundTrip(
        'claimant-text-message',
        { contactByText: 'yes', 'contactByText.textMessageNumber': '07700900982' },
        phone
      ).saved.claimant?.textMessageNumber
    ).toBeUndefined();
    expect(
      roundTrip(
        'claimant-text-message',
        { contactByText: 'yes', 'contactByText.textMessageNumber': '07700900111' },
        phone
      ).saved.claimant?.textMessageNumber
    ).toBe('07700900111');
  });

  it('drops the phone number when the claimant does not want calls', () => {
    const { saved } = roundTrip('claimant-phone', { contactByPhone: 'no', 'contactByPhone.phoneNumber': '0123' });
    expect(saved.claimant).toEqual({ contactByPhone: 'NO', phoneNumber: undefined });
  });

  it('saves each defendant at its own position', () => {
    const first = roundTrip('defendant-name', {
      nameKnown: 'yes',
      'nameKnown.firstName': 'Brian',
      'nameKnown.lastName': 'Springford',
    }).saved;
    const { saved, form } = roundTrip('defendant-name', { nameKnown: 'no' }, first, request({ index: '1' }));
    expect(saved.defendants).toEqual([
      { value: { nameKnown: 'YES', firstName: 'Brian', lastName: 'Springford' } },
      { value: { nameKnown: 'NO', firstName: undefined, lastName: undefined } },
    ]);
    expect(form).toEqual({ nameKnown: 'no', 'nameKnown.firstName': undefined, 'nameKnown.lastName': undefined });
  });

  it('records that the defendant’s address for service is the property', () => {
    const { saved, form } = roundTrip('defendant-address', {
      sameAsProperty: 'yes',
      'defendant-addressLine1': 'ignored',
    });
    expect(saved.defendants?.[0].value).toEqual({
      addressSameAsProperty: 'YES',
      addressKnown: 'YES',
      address: undefined,
    });
    expect(form).toEqual({ sameAsProperty: 'yes' });
  });

  it('reads a different defendant address back as a different address', () => {
    const { form } = roundTrip('defendant-address', {
      sameAsProperty: 'no',
      'defendant-addressLine1': '2 Other Road',
      'defendant-town': 'Luton',
      'defendant-postcode': 'LU2 2BB',
    });
    expect(form).toMatchObject({ sameAsProperty: 'no', 'defendant-addressLine1': '2 Other Road' });
    expect(
      roundTrip('defendant-address', { sameAsProperty: 'no' }).saved.defendants?.[0].value.addressKnown
    ).toBeUndefined();
  });

  it('adds and removes defendants after the first', () => {
    const claim: CitizenPossessionClaim = {
      defendants: [{ value: { nameKnown: 'NO' } }, { value: { nameKnown: 'YES' } }],
    };
    removeDefendant(claim, 0);
    expect(claim.defendants).toHaveLength(2);
    removeDefendant(claim, 1);
    expect(claim.defendants).toEqual([{ value: { nameKnown: 'NO' } }]);
  });

  it('saves the tenancy type with its details only for another type', () => {
    expect(
      roundTrip('tenancy-type', { tenancyType: 'OTHER', 'tenancyType.otherTenancyTypeDetails': 'Licence' }).saved
        .tenancy
    ).toEqual({ tenancyType: 'OTHER', otherTenancyTypeDetails: 'Licence' });
    expect(
      roundTrip('tenancy-type', { tenancyType: 'ASSURED', 'tenancyType.otherTenancyTypeDetails': 'Licence' }).saved
        .tenancy
    ).toEqual({ tenancyType: 'ASSURED', otherTenancyTypeDetails: undefined });
  });

  it('saves dates as yyyy-MM-dd and reads them back as parts', () => {
    const { saved, form } = roundTrip('tenancy-start-date', {
      tenancyStartDate: { day: '15', month: '1', year: '2018' },
    });
    expect(saved.tenancy?.tenancyStartDate).toBe('2018-01-15');
    expect(form).toEqual({ tenancyStartDate: { day: '15', month: '1', year: '2018' } });
  });

  it('saves the grounds as pcs-api’s codes, splitting other grounds back into their groups', () => {
    const { saved, form } = roundTrip('other-grounds', {
      mandatoryGrounds: ['GROUND_1A', 'GROUND_99'],
      discretionaryGrounds: 'GROUND_14',
    });
    expect(saved.grounds?.otherGrounds).toEqual(['GROUND_1A', 'GROUND_14']);
    expect(form).toEqual({ mandatoryGrounds: ['GROUND_1A'], discretionaryGrounds: ['GROUND_14'] });
  });

  it('keeps details for other grounds and the Ground 1A reason only while those grounds are chosen', () => {
    const chosen = roundTrip('other-grounds', {
      mandatoryGrounds: ['GROUND_1A', 'OTHER'],
      'mandatoryGrounds.otherGroundsDetails': 'Subletting',
    }).saved;
    expect(chosen.grounds?.otherGroundsDetails).toBe('Subletting');
    const reasoned = roundTrip('ground-1a-reason', { ground1AReason: 'Selling the house' }, chosen);
    expect(reasoned.saved.grounds?.groundReasons).toEqual([
      { value: { ground: 'GROUND_1A', reason: 'Selling the house' } },
    ]);
    expect(reasoned.form).toEqual({ ground1AReason: 'Selling the house' });
    const dropped = roundTrip('other-grounds', { mandatoryGrounds: ['GROUND_2'] }, reasoned.saved).saved;
    expect(dropped.grounds).toMatchObject({
      otherGrounds: ['GROUND_2'],
      otherGroundsDetails: undefined,
      groundReasons: [],
    });
  });

  it.each([
    ['tenancy-agreement', 'tenancyAgreementAvailable', 'noTenancyAgreementReason', 'tenancy'],
    ['notice-served', 'noticeServed', 'noNoticeReason', 'notice'],
    ['notice-available', 'noticeAvailable', 'noticeUnavailableReason', 'notice'],
  ] as const)('asks %s why not on a no, and forgets it on a yes', (step, field, reason, group) => {
    const no = roundTrip(step, { [field]: 'no', [`${field}.${reason}`]: 'Lost it' });
    expect((no.saved as Record<string, Record<string, unknown>>)[group]).toEqual({
      [field]: 'NO',
      [reason]: 'Lost it',
    });
    expect(no.form).toEqual({ [field]: 'no', [`${field}.${reason}`]: 'Lost it' });
    const yes = roundTrip(step, { [field]: 'yes', [`${field}.${reason}`]: 'Lost it' }, no.saved);
    expect((yes.saved as Record<string, Record<string, unknown>>)[group][reason]).toBeUndefined();
  });

  it('saves the date and details of each way notice was served, and clears the others', () => {
    const { saved, form } = roundTrip(
      'notice-method',
      {
        noticeMethods: ['PERSONALLY_HANDED', 'EMAIL'],
        'noticeMethods.handedToName': 'Brad Dolan',
        'noticeMethods.handedDate-day': '9',
        'noticeMethods.handedDate-month': '6',
        'noticeMethods.handedDate-year': '2026',
        'noticeMethods.emailedTo': 'tenant@example.test',
        'noticeMethods.emailedDate-day': '10',
        'noticeMethods.emailedDate-month': '6',
        'noticeMethods.emailedDate-year': '2026',
      },
      { notice: { noticeServed: 'YES', postedDate: '2026-01-01' } }
    );
    expect(saved.notice).toEqual(
      expect.objectContaining({
        noticeServed: 'YES',
        noticeMethods: ['PERSONALLY_HANDED', 'EMAIL'],
        handedToName: 'Brad Dolan',
        handedDate: '2026-06-09',
        emailedTo: 'tenant@example.test',
        emailedDate: '2026-06-10',
        postedDate: undefined,
      })
    );
    expect(form).toMatchObject({
      noticeMethods: ['PERSONALLY_HANDED', 'EMAIL'],
      'noticeMethods.handedToName': 'Brad Dolan',
      'noticeMethods.handedDate': { day: '9', month: '6', year: '2026' },
    });
  });

  it('saves money as pence and reads it back as pounds', () => {
    const { saved, form } = roundTrip('rent-amount', { rentAmount: '1,250.5' });
    expect(saved.rentArrears?.rentAmount).toBe('125050');
    expect(form).toEqual({ rentAmount: '1250.50' });
  });

  it('dates the current arrears today', () => {
    const { saved } = roundTrip('current-arrears', { currentArrears: '3000' });
    expect(saved.rentArrears).toEqual({
      currentArrears: '300000',
      currentArrearsDate: new Date().toISOString().slice(0, 10),
    });
  });

  it('only takes a proof type the design offers', () => {
    expect(roundTrip('arrears-proof', { proofType: 'TABLE' }).saved.rentArrears?.proofType).toBeUndefined();
    expect(roundTrip('arrears-proof', { proofType: 'LEDGER' }).saved.rentArrears?.proofType).toBe('LEDGER');
    const monthly: CitizenPossessionClaim = { rentArrears: { rentFrequency: 'MONTHLY' } };
    const table = request({}, 'table', monthly);
    expect(roundTrip('arrears-proof', { proofType: 'TABLE' }, monthly, table).saved.rentArrears?.proofType).toBe(
      'TABLE'
    );
    const other = request({}, 'table', { rentArrears: { rentFrequency: 'OTHER' } });
    expect(roundTrip('arrears-proof', { proofType: 'TABLE' }, {}, other).saved.rentArrears?.proofType).toBeUndefined();
  });

  it('counts a proof type from the other design as not answered', () => {
    expect(claimMappings['arrears-proof'].isAnswered!({ rentArrears: { proofType: 'TABLE' } }, request())).toBe(false);
  });

  it('adds a ledger transaction and edits it in place', () => {
    const body = {
      transactionDate: { day: '1', month: '6', year: '2026' },
      transactionTypes: ['RENT_CHARGE'],
      'transactionTypes.amountCharged': '500',
      'transactionTypes.amountPaid': '20',
      description: 'June rent',
    };
    const added = roundTrip('ledger-transaction', body).saved;
    expect(added.rentArrears?.rentHistoryLedger).toEqual([
      {
        value: {
          transactionDate: '2026-06-01',
          transactionTypes: ['RENT_CHARGE'],
          description: 'June rent',
          amountCharged: '50000',
          amountPaid: undefined,
        },
      },
    ]);
    const { saved, form } = roundTrip(
      'ledger-transaction',
      { ...body, transactionTypes: ['TENANT_PAYMENT'] },
      added,
      request({ entry: '0' })
    );
    expect(saved.rentArrears?.rentHistoryLedger).toHaveLength(1);
    expect(form).toMatchObject({ transactionTypes: ['TENANT_PAYMENT'], 'transactionTypes.amountPaid': '20.00' });
    removeLedgerEntry(saved, 0);
    expect(saved.rentArrears?.rentHistoryLedger).toEqual([]);
  });

  it('generates the rent statement from the period, then regenerates it when the rent changes', () => {
    const claim: CitizenPossessionClaim = {
      rentArrears: { rentAmount: '100000', rentFrequency: 'MONTHLY', rentDueDay: 1 },
    };
    const { saved, form } = roundTrip(
      'statement-period',
      {
        statementStart: { day: '1', month: '6', year: '2026' },
        statementEnd: { day: '31', month: '7', year: '2026' },
      },
      claim
    );
    expect(saved.rentArrears?.rentHistoryTable).toEqual([
      { value: { periodStart: '2026-06-01', dateDue: '2026-06-01', amountDue: '100000' } },
      { value: { periodStart: '2026-07-01', dateDue: '2026-07-01', amountDue: '100000' } },
    ]);
    expect(form).toEqual({
      statementStart: { day: '1', month: '6', year: '2026' },
      statementEnd: { day: '1', month: '7', year: '2026' },
    });
    const { saved: rentRise } = roundTrip('rent-amount', { rentAmount: '1100' }, saved);
    expect(rentRise.rentArrears?.rentHistoryTable?.map(row => row.value.amountDue)).toEqual(['110000', '110000']);
  });

  it('records a payment against a rent period and edits it by row', () => {
    const claim: CitizenPossessionClaim = {
      rentArrears: {
        rentHistoryTable: [{ value: { periodStart: '2026-06-01', dateDue: '2026-06-01', amountDue: '100000' } }],
      },
    };
    const body = { datePaid: { day: '5', month: '6', year: '2026' }, amountPaid: '50' };
    const { saved } = roundTrip('rent-statement-payment', body, claim, request({ period: '2026-06-01' }));
    expect(saved.rentArrears?.rentHistoryTable?.[0].value).toMatchObject({
      datePaid: '2026-06-05',
      amountPaid: '5000',
    });
    const { saved: edited, form } = roundTrip(
      'rent-statement-payment',
      { ...body, amountPaid: '75' },
      saved,
      request({ row: '0' })
    );
    expect(edited.rentArrears?.rentHistoryTable?.[0].value.amountPaid).toBe('7500');
    expect(form).toEqual({ datePaid: { day: '5', month: '6', year: '2026' }, amountPaid: '75.00' });
    expect(roundTrip('rent-statement-payment', body, claim, request({ period: '1999-01-01' })).saved).toEqual(claim);
  });

  it('keeps an optional answer the claimant left blank as answered', () => {
    const { saved, answered } = roundTrip('recovery-steps', { recoverySteps: '   ' });
    expect(saved.rentArrears?.recoverySteps).toBe('');
    expect(answered).toBe(true);
  });

  it('marks the other files page visited even without an upload', () => {
    expect(roundTrip('upload-other-documents', {}).saved.otherInformation).toEqual({ otherDocuments: [] });
  });

  it('agrees the statement of truth only when both parts are confirmed', () => {
    expect(
      roundTrip('check-your-answers', { statementOfTruth: ['belief'] }).saved.submission?.statementOfTruthAgreed
    ).toBeUndefined();
    expect(
      roundTrip('check-your-answers', {
        statementOfTruth: ['contempt', 'belief'],
        statementOfTruthFullName: 'Billy Wright',
      }).saved.submission
    ).toEqual({
      statementOfTruthAgreed: 'YES',
      statementOfTruthFullName: 'Billy Wright',
      statementOfTruthPosition: undefined,
    });
  });

  it.each([
    ['claimant-text-message', 'contactByText', 'claimant'],
    ['multiple-claimants', 'multipleClaimants', 'claimant'],
    ['rent-arrears-claim', 'hasRentArrearsGrounds', 'grounds'],
    ['other-grounds-claim', 'hasOtherGrounds', 'grounds'],
    ['money-judgment', 'moneyJudgmentWanted', 'rentArrears'],
    ['underlessee', 'underlesseeExists', 'circumstances'],
    ['general-application', 'generalApplicationIntent', 'otherInformation'],
  ] as const)('saves the %s yes or no answer', (step, field, group) => {
    const { saved, form, answered } = roundTrip(step, { [field]: 'no' });
    expect((saved as Record<string, Record<string, unknown>>)[group][field]).toBe('NO');
    expect(form).toEqual({ [field]: 'no' });
    expect(answered).toBe(true);
  });
});
