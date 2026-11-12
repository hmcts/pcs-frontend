import type { Request } from 'express';

import type { CitizenPossessionClaim } from '../../../../main/services/citizenPossessionClaim.interface';
import {
  claimMappings,
  groundForReasonOf,
  paymentDueDateLimitOf,
  removeDefendant,
  removeLedgerEntry,
  rentChangeExceedsLimit,
  rentPaymentToRemoveOf,
  rentStatementRange,
} from '../../../../main/steps/make-a-claim/claimMapping';
import { UNREADABLE } from '../../../../main/steps/make-a-claim/formValues';

const CASE = '1777027600017761';
const PROPERTY = { AddressLine1: '15 Garden Drive', PostTown: 'Luton', PostCode: 'LU1 1AB' };

function request(
  query: Record<string, string> = {},
  rentHistoryDesign = 'ledger',
  citizenPossessionClaim: CitizenPossessionClaim = {},
  caseId = CASE
): Request {
  return {
    query,
    session: { user: { email: 'landlord@example.test' } },
    res: {
      locals: {
        rentHistoryDesign,
        validatedCase: { id: caseId, data: { propertyAddress: PROPERTY, citizenPossessionClaim } },
      },
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
      { id: expect.any(String), value: { nameKnown: 'YES', firstName: 'Brian', lastName: 'Springford' } },
      { id: expect.any(String), value: { nameKnown: 'NO', firstName: undefined, lastName: undefined } },
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
      mandatoryGrounds: ['GROUND_1A', 'GROUND_99', 'OTHER'],
      discretionaryGrounds: 'GROUND_14',
      otherGround: ['OTHER'],
      'otherGround.otherGroundsDetails': 'Subletting',
    });
    expect(saved.grounds).toMatchObject({
      otherGrounds: ['GROUND_1A', 'GROUND_14', 'OTHER'],
      otherGroundsDetails: 'Subletting',
    });
    expect(form).toEqual({
      mandatoryGrounds: ['GROUND_1A'],
      discretionaryGrounds: ['GROUND_14'],
      otherGround: ['OTHER'],
      'otherGround.otherGroundsDetails': 'Subletting',
    });
  });

  describe('ground reasons', () => {
    const chosen = roundTrip('other-grounds', {
      mandatoryGrounds: ['GROUND_1A', 'GROUND_2'],
      discretionaryGrounds: ['GROUND_14'],
      otherGround: ['OTHER'],
      'otherGround.otherGroundsDetails': 'Subletting',
    }).saved;

    it('asks for a reason for every chosen ground but the rent arrears ones and other grounds, first one first', () => {
      expect(groundForReasonOf(request(), chosen)).toBe('GROUND_1A');
      expect(groundForReasonOf(request({ ground: 'GROUND_14' }), chosen)).toBe('GROUND_14');
      expect(groundForReasonOf(request({ ground: 'OTHER' }), chosen)).toBeUndefined();
      expect(groundForReasonOf(request({ ground: 'GROUND_8' }), chosen)).toBeUndefined();
    });

    it('names the first ground still without a reason', () => {
      const mapping = claimMappings['ground-reason'];
      expect(mapping.unansweredQuery?.(chosen)).toBe('?ground=GROUND_1A');
      const first = roundTrip('ground-reason', { groundReason: 'Selling' }, chosen, request({ ground: 'GROUND_1A' }));
      expect(mapping.unansweredQuery?.(first.saved)).toBe('?ground=GROUND_2');
      expect(first.answered).toBe(false);
    });

    it('asks in the order the grounds page lists them, whatever order the claim holds them in', () => {
      const reordered: CitizenPossessionClaim = { grounds: { otherGrounds: ['GROUND_14', 'OTHER', 'GROUND_1A'] } };
      expect(groundForReasonOf(request(), reordered)).toBe('GROUND_1A');
    });

    it('saves each reason against its ground in the order the grounds were chosen', () => {
      const second = roundTrip(
        'ground-reason',
        { groundReason: 'Mortgage default' },
        chosen,
        request({ ground: 'GROUND_2' })
      );
      const first = roundTrip(
        'ground-reason',
        { groundReason: 'Selling' },
        second.saved,
        request({ ground: 'GROUND_1A' })
      );
      expect(first.saved.grounds?.groundReasons).toEqual([
        { id: expect.any(String), value: { ground: 'GROUND_1A', reason: 'Selling' } },
        { id: expect.any(String), value: { ground: 'GROUND_2', reason: 'Mortgage default' } },
      ]);
      expect(first.form).toEqual({ groundReason: 'Selling' });
      expect(first.answered).toBe(false);
      const all = roundTrip(
        'ground-reason',
        { groundReason: 'Nuisance' },
        first.saved,
        request({ ground: 'GROUND_14' })
      );
      expect(all.answered).toBe(true);
    });

    it('drops the reasons and details of grounds no longer chosen', () => {
      const reasoned = roundTrip(
        'ground-reason',
        { groundReason: 'Selling' },
        chosen,
        request({ ground: 'GROUND_1A' })
      ).saved;
      const dropped = roundTrip('other-grounds', { mandatoryGrounds: ['GROUND_2'] }, reasoned).saved;
      expect(dropped.grounds).toMatchObject({
        otherGrounds: ['GROUND_2'],
        otherGroundsDetails: undefined,
        groundReasons: [],
      });
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
        id: expect.any(String),
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
      statementEnd: { day: '31', month: '7', year: '2026' },
    });
    const { saved: rentRise } = roundTrip('rent-amount', { rentAmount: '1100' }, saved);
    expect(rentRise.rentArrears?.rentHistoryTable?.map(row => row.value.amountDue)).toEqual(['110000', '110000']);
  });

  describe('changing the due day of a rent statement', () => {
    const monthly: CitizenPossessionClaim = {
      rentArrears: { rentAmount: '100000', rentFrequency: 'MONTHLY', rentDueDay: 1 },
    };
    const period = {
      statementStart: { day: '1', month: '6', year: '2026' },
      statementEnd: { day: '31', month: '8', year: '2026' },
    };
    const dueDates = (claim: CitizenPossessionClaim) =>
      claim.rentArrears?.rentHistoryTable?.filter(row => row.value.amountDue).map(row => row.value.dateDue);

    it('keeps the end date the claimant gave', () => {
      const req = request();
      const { saved } = roundTrip('statement-period', period, monthly, req);
      expect(dueDates(saved)).toEqual(['2026-06-01', '2026-07-01', '2026-08-01']);
      const { saved: moved } = roundTrip('rent-due-day', { rentDueDay: '15' }, saved, req);
      expect(dueDates(moved)).toEqual(['2026-06-15', '2026-07-15', '2026-08-15']);
    });

    it('uses the dates given only for the claim they were given for', () => {
      const req = request();
      const { saved } = roundTrip('statement-period', period, monthly, req);
      const otherClaim = request({}, 'ledger', {}, '1777027600019999');
      otherClaim.session = req.session;
      expect(rentStatementRange({ rentArrears: { rentFrequency: 'WEEKLY' } }, otherClaim)).toBeUndefined();
      expect(rentStatementRange(saved, req)).toEqual({ statementStart: '2026-06-01', statementEnd: '2026-08-31' });
      expect(req.session.rentStatementPeriods).toEqual({
        [CASE]: { statementStart: '2026-06-01', statementEnd: '2026-08-31' },
      });
    });

    it('keeps the period its rows cover when the dates given are no longer in the session', () => {
      const { saved } = roundTrip('statement-period', period, monthly);
      const { saved: moved } = roundTrip('rent-due-day', { rentDueDay: '15' }, saved, request());
      expect(dueDates(moved)).toEqual(['2026-06-15', '2026-07-15', '2026-08-15']);
    });

    it('carries the payments entered over to the new periods by date', () => {
      const req = request();
      const { saved } = roundTrip('statement-period', period, monthly, req);
      const paid = roundTrip(
        'rent-statement-payment',
        { datePaid: { day: '20', month: '8', year: '2026' }, amountPaid: '500' },
        saved,
        request({ period: '2026-08-01' })
      ).saved;
      const { saved: moved } = roundTrip('rent-due-day', { rentDueDay: '15' }, paid, req);
      expect(moved.rentArrears?.rentHistoryTable?.find(row => row.value.amountPaid)?.value).toMatchObject({
        periodStart: '2026-08-15',
        datePaid: '2026-08-20',
        amountPaid: '50000',
      });
    });

    it('lays weekly rent out again over the same period when the frequency changes', () => {
      const req = request();
      const { saved } = roundTrip('statement-period', period, monthly, req);
      const { saved: weekly } = roundTrip('rent-frequency', { rentFrequency: 'WEEKLY' }, saved, req);
      expect(dueDates(weekly)?.slice(-1)).toEqual(['2026-08-31']);
    });
  });

  describe('a statement period with as many rent periods as a statement can show', () => {
    const monthly: CitizenPossessionClaim = {
      rentArrears: { rentAmount: '100000', rentFrequency: 'MONTHLY', rentDueDay: 1 },
    };
    const fullPeriod = {
      statementStart: { day: '10', month: '1', year: '2004' },
      statementEnd: { day: '15', month: '9', year: '2025' },
    };

    it('refuses a change of frequency or due day that would add more, rather than dropping the later ones', () => {
      const req = request();
      const { saved } = roundTrip('statement-period', fullPeriod, monthly, req);
      expect(saved.rentArrears?.rentHistoryTable).toHaveLength(260);
      expect(rentChangeExceedsLimit(saved, req, { rentFrequency: 'WEEKLY' })).toBe(true);
      expect(rentChangeExceedsLimit(saved, req, { rentDueDay: 12 })).toBe(true);
      expect(rentChangeExceedsLimit(saved, req, { rentDueDay: 5 })).toBe(false);
      expect(rentChangeExceedsLimit(saved, req, { rentFrequency: 'OTHER' })).toBe(false);
    });

    it('keeps the rent as it was when such a change is saved for later', () => {
      const req = request();
      const { saved } = roundTrip('statement-period', fullPeriod, monthly, req);
      expect(roundTrip('rent-frequency', { rentFrequency: 'WEEKLY' }, saved, req).saved).toEqual(saved);
      expect(roundTrip('rent-due-day', { rentDueDay: '12' }, saved, req).saved).toEqual(saved);
    });

    it('neither lays out nor remembers a period with more', () => {
      const req = request();
      const { saved } = roundTrip(
        'statement-period',
        { ...fullPeriod, statementEnd: { day: '15', month: '10', year: '2025' } },
        monthly,
        req
      );
      expect(saved).toEqual(monthly);
      expect(req.session.rentStatementPeriods).toBeUndefined();
    });
  });

  describe('payments on a rent statement', () => {
    const claim: CitizenPossessionClaim = {
      rentArrears: {
        rentHistoryTable: [
          { value: { periodStart: '2026-07-01', dateDue: '2026-07-01', amountDue: '100000' } },
          { value: { periodStart: '2026-06-01', dateDue: '2026-06-01', amountDue: '100000', amountPaid: '5000' } },
        ],
      },
    };

    it('takes a payment made before the rent was due only on the first period', () => {
      expect(paymentDueDateLimitOf(request({ period: '2026-06-01' }), claim)).toBeUndefined();
      expect(paymentDueDateLimitOf(request({ period: '2026-07-01' }), claim)).toBe('2026-07-01');
    });

    it('removes a payment that has no date', () => {
      expect(rentPaymentToRemoveOf(request({ row: '1', datePaid: '', amountPaid: '5000' }), claim)).toBe(1);
      expect(rentPaymentToRemoveOf(request({ row: '1', datePaid: '2026-06-02', amountPaid: '5000' }), claim)).toBe(
        undefined
      );
    });
  });

  it('adds no ledger entry for a transaction page saved for later empty', () => {
    expect(roundTrip('ledger-transaction', { transactionTypes: [] }).saved).toEqual({});
  });

  it('removes an item by its id, so repeating the removal changes nothing', () => {
    const claim: CitizenPossessionClaim = {
      defendants: [
        { id: 'first', value: { nameKnown: 'NO' } },
        { id: 'second', value: { nameKnown: 'YES' } },
        { id: 'third', value: { nameKnown: 'YES' } },
      ],
      rentArrears: {
        rentHistoryLedger: [
          { id: 'june', value: {} },
          { id: 'july', value: {} },
        ],
      },
    };
    const once = roundTrip('remove-defendant', { confirmRemove: 'yes' }, claim, request({ id: 'second' })).saved;
    expect(once.defendants?.map(item => item.id)).toEqual(['first', 'third']);
    const twice = roundTrip('remove-defendant', { confirmRemove: 'yes' }, once, request({ id: 'second' })).saved;
    expect(twice.defendants?.map(item => item.id)).toEqual(['first', 'third']);
    expect(roundTrip('remove-defendant', { confirmRemove: 'yes' }, claim, request({ id: 'first' })).saved).toEqual(
      claim
    );
    expect(roundTrip('remove-defendant', { confirmRemove: 'yes' }, claim, request({ index: '1' })).saved).toEqual(
      claim
    );
    const ledger = roundTrip('remove-ledger-entry', { confirmRemove: 'yes' }, claim, request({ id: 'june' })).saved;
    expect(ledger.rentArrears?.rentHistoryLedger?.map(item => item.id)).toEqual(['july']);
  });

  it('keeps an unreadable date or amount as the saved one, and a cleared answer cleared', () => {
    const saved: CitizenPossessionClaim = { rentArrears: { rentAmount: '100000', recoverySteps: 'Letters' } };
    expect(roundTrip('rent-amount', { rentAmount: 'lots' }, saved).saved.rentArrears?.rentAmount).toBe(UNREADABLE);
    expect(roundTrip('rent-amount', { rentAmount: '' }, saved).saved.rentArrears?.rentAmount).toBeUndefined();
    expect(
      roundTrip('tenancy-start-date', { tenancyStartDate: { day: '31', month: '2', year: '2020' } }).saved.tenancy
        ?.tenancyStartDate
    ).toBe(UNREADABLE);
  });

  it('removes a defendant after the first, and a ledger entry, only when confirmed', () => {
    const claim: CitizenPossessionClaim = {
      defendants: [{ value: { nameKnown: 'NO' } }, { value: { nameKnown: 'YES' } }],
      rentArrears: { rentHistoryLedger: [{ value: { transactionDate: '2026-06-01' } }] },
    };
    expect(roundTrip('remove-defendant', { confirmRemove: 'no' }, claim, request({ index: '1' })).saved).toEqual(claim);
    expect(
      roundTrip('remove-defendant', { confirmRemove: 'yes' }, claim, request({ index: '1' })).saved.defendants
    ).toEqual([{ value: { nameKnown: 'NO' } }]);
    expect(
      roundTrip('remove-defendant', { confirmRemove: 'yes' }, claim, request({ index: '0' })).saved.defendants
    ).toHaveLength(2);
    expect(
      roundTrip('remove-ledger-entry', { confirmRemove: 'yes' }, claim, request({ entry: '0' })).saved.rentArrears
        ?.rentHistoryLedger
    ).toEqual([]);
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
