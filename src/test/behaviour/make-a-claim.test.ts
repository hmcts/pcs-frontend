/**
 * @jest-environment node
 */
import { JSDOM } from 'jsdom';

import {
  CASE_REFERENCE,
  type TestApp,
  bootMakeAClaim,
  ccd,
  claimPath,
  givenClaim,
  storedClaim,
} from './makeAClaimHarness';

const PROPERTY = {
  'property-addressLine1': '15 Garden Drive',
  'property-town': 'Luton',
  'property-postcode': 'LU1 1AB',
};

const ANSWERED_CLAIM = {
  eligibility: { isTrespass: 'NO', whoIsClaiming: 'MYSELF' },
  claimant: {
    individualOrOrganisation: 'INDIVIDUAL',
    firstName: 'Billy',
    lastName: 'Wright',
    address: { AddressLine1: '12 High Street', PostTown: 'London', PostCode: 'NW1 1AA' },
    emailAddress: 'pl-ledger-0001@example.test',
    contactByPhone: 'YES',
    phoneNumber: '07700900982',
    contactByText: 'NO',
    multipleClaimants: 'NO',
  },
  defendants: [
    {
      value: {
        nameKnown: 'YES',
        firstName: 'Brian',
        lastName: 'Springford',
        addressKnown: 'YES',
        addressSameAsProperty: 'YES',
      },
    },
  ],
  additionalDefendants: 'NO',
  tenancy: { tenancyType: 'ASSURED', tenancyStartDate: '2018-01-15', tenancyAgreementAvailable: 'NO' },
  grounds: { hasRentArrearsGrounds: 'YES', rentArrearsGrounds: ['GROUND_8'], hasOtherGrounds: 'NO' },
  notice: {
    noticeServed: 'YES',
    noticeType: 'NOTICE_SEEKING_POSSESSION',
    noticeDate: '2026-06-09',
    noticeMethods: ['PERSONALLY_HANDED'],
    handedToName: 'Brad Dolan',
    handedDate: '2026-06-09',
    noticeAvailable: 'NO',
  },
  rentArrears: {
    rentAmount: '100000',
    rentFrequency: 'MONTHLY',
    arrearsAtNoticeDate: '300000',
    currentArrears: '300000',
    currentArrearsDate: '2026-11-06',
  },
  circumstances: { defendantCircumstances: '', claimantCircumstances: '', underlesseeExists: 'NO' },
  otherInformation: {
    otherDocuments: [],
    hasOtherReasons: 'NO',
    generalApplicationIntent: 'NO',
    languageUsed: 'ENGLISH',
  },
};

function text(html: string): string {
  return new JSDOM(html).window.document.body.textContent?.replace(/\s+/g, ' ') ?? '';
}

let app: TestApp;
afterEach(() => app?.close());

describe('with the journey switched off', () => {
  beforeEach(async () => {
    app = await bootMakeAClaim({ enabled: false });
    givenClaim(ANSWERED_CLAIM);
  });

  it.each([
    '/make-a-claim',
    '/make-a-claim/claimant-type',
    '/make-a-claim/who-is-claiming',
    claimPath('task-list'),
    claimPath('rent-amount'),
    `/case/${CASE_REFERENCE}/make-a-claim/upload-notice/upload`,
    `/case/${CASE_REFERENCE}/pay-claim-fee`,
    `/case/${CASE_REFERENCE}/claim-submitted`,
  ])('does not exist at %s', async path => {
    expect((await app.get(path)).status).toBe(404);
  });

  it('refuses posts too', async () => {
    expect((await app.post('/make-a-claim/claimant-type', { claimantType: 'PRIVATE_LANDLORD' })).status).toBe(404);
    expect(ccd.createRequests).toEqual([]);
  });
});

describe('before a claim exists', () => {
  it('lets anyone read the start page and answer the claimant type, then asks them to sign in', async () => {
    app = await bootMakeAClaim({ signedIn: false });
    const start = await app.get('/make-a-claim');
    expect(start.status).toBe(200);
    expect(text(start.text)).toContain('Make a property possession claim online');

    const answered = await app.post('/make-a-claim/claimant-type', { claimantType: 'PRIVATE_LANDLORD' });
    expect(answered.location).toBe('/make-a-claim/trespass');
    expect((await app.get('/make-a-claim/trespass')).location).toBe('/login');
  });

  it('turns away claimants who are not private landlords', async () => {
    app = await bootMakeAClaim({ signedIn: false });
    const answered = await app.post('/make-a-claim/claimant-type', { claimantType: 'MORTGAGE_LENDER' });
    expect(answered.location).toBe('/make-a-claim/not-private-landlord');
    expect(text((await app.get('/make-a-claim/not-private-landlord')).text)).toContain('Only private landlords');
  });

  it('turns away claims against trespassers', async () => {
    app = await bootMakeAClaim();
    await app.post('/make-a-claim/claimant-type', { claimantType: 'PRIVATE_LANDLORD' });
    expect((await app.post('/make-a-claim/trespass', { isTrespass: 'yes' })).location).toBe(
      '/make-a-claim/trespass-ineligible'
    );
    expect(text((await app.get('/make-a-claim/trespass-ineligible')).text)).toContain('form N5');
  });

  it('turns away anyone claiming for someone else', async () => {
    app = await bootMakeAClaim();
    await app.post('/make-a-claim/claimant-type', { claimantType: 'PRIVATE_LANDLORD' });
    await app.post('/make-a-claim/trespass', { isTrespass: 'no' });
    await app.post('/make-a-claim/property-address', PROPERTY);
    expect((await app.post('/make-a-claim/who-is-claiming', { whoIsClaiming: 'SOLICITOR' })).location).toBe(
      '/make-a-claim/not-litigant-in-person'
    );
    expect(ccd.createRequests).toEqual([]);
  });

  it('creates the claim for an eligible private landlord with their eligibility answers', async () => {
    app = await bootMakeAClaim();
    await app.post('/make-a-claim/claimant-type', { claimantType: 'PRIVATE_LANDLORD' });
    await app.post('/make-a-claim/trespass', { isTrespass: 'no' });
    expect((await app.post('/make-a-claim/property-address', PROPERTY)).location).toBe('/make-a-claim/who-is-claiming');

    const created = await app.post('/make-a-claim/who-is-claiming', { whoIsClaiming: 'MYSELF' });

    expect(created.location).toBe(claimPath('eligible'));
    expect(ccd.createRequests).toEqual([
      expect.objectContaining({
        event: expect.objectContaining({ id: 'citizenCreatePossessionClaim' }),
        data: {
          citizenPossessionClaim: {
            propertyAddress: { AddressLine1: '15 Garden Drive', PostTown: 'Luton', PostCode: 'LU1 1AB' },
            eligibility: { claimantType: 'PRIVATE_LANDLORD', isTrespass: 'NO', whoIsClaiming: 'MYSELF' },
          },
        },
      }),
    ]);
    expect(text((await app.get(claimPath('eligible'))).text)).toContain('You’re eligible to use this service');

    await app.post(claimPath('individual-or-organisation'), { individualOrOrganisation: 'INDIVIDUAL' });
    expect(ccd.draftSaves[0]).toMatchObject({
      pageId: 'citizenMakePossessionClaimcitizenMakePossessionClaimDraftSavePage',
      case_reference: CASE_REFERENCE,
      event: { id: 'citizenMakePossessionClaim' },
    });
    expect(ccd.draftSaves[0].event_data.citizenPossessionClaim.draftVersion).toBe(1);
    expect(storedClaim()).toEqual({
      propertyAddress: { AddressLine1: '15 Garden Drive', PostTown: 'Luton', PostCode: 'LU1 1AB' },
      eligibility: { claimantType: 'PRIVATE_LANDLORD', isTrespass: 'NO', whoIsClaiming: 'MYSELF' },
      claimant: { individualOrOrganisation: 'INDIVIDUAL' },
      draftVersion: 2,
    });
  });

  it('asks which country a cross-border property is in, and creates the claim for England', async () => {
    app = await bootMakeAClaim();
    ccd.refuseCreate = 'LEGISLATIVE_COUNTRY_REQUIRED';
    await app.post('/make-a-claim/claimant-type', { claimantType: 'PRIVATE_LANDLORD' });
    await app.post('/make-a-claim/trespass', { isTrespass: 'no' });
    await app.post('/make-a-claim/property-address', PROPERTY);
    expect((await app.post('/make-a-claim/who-is-claiming', { whoIsClaiming: 'MYSELF' })).location).toBe(
      '/make-a-claim/property-country'
    );
    expect(text((await app.get('/make-a-claim/property-country')).text)).toContain(
      'Is the property in England or Wales?'
    );

    ccd.refuseCreate = undefined;
    expect((await app.post('/make-a-claim/property-country', { legislativeCountry: 'England' })).location).toBe(
      claimPath('eligible')
    );
    expect(ccd.createRequests[1].data.citizenPossessionClaim.eligibility.legislativeCountry).toBe('England');
  });

  it('turns away a cross-border property in Wales without creating the claim', async () => {
    app = await bootMakeAClaim();
    await app.post('/make-a-claim/claimant-type', { claimantType: 'PRIVATE_LANDLORD' });
    await app.post('/make-a-claim/trespass', { isTrespass: 'no' });
    await app.post('/make-a-claim/property-address', PROPERTY);
    expect((await app.post('/make-a-claim/property-country', { legislativeCountry: 'Wales' })).location).toBe(
      '/make-a-claim/property-ineligible'
    );
    expect(ccd.createRequests).toEqual([]);
  });

  it('turns away a property whose court does not take claims through this service yet', async () => {
    app = await bootMakeAClaim();
    ccd.refuseCreate = 'PROPERTY_NOT_ELIGIBLE';
    await app.post('/make-a-claim/claimant-type', { claimantType: 'PRIVATE_LANDLORD' });
    await app.post('/make-a-claim/trespass', { isTrespass: 'no' });
    await app.post('/make-a-claim/property-address', PROPERTY);
    expect((await app.post('/make-a-claim/who-is-claiming', { whoIsClaiming: 'MYSELF' })).location).toBe(
      '/make-a-claim/property-not-covered'
    );
    expect((await app.get('/make-a-claim/property-not-covered')).status).toBe(200);
  });

  it('sends a property outside England to the property ineligible page', async () => {
    app = await bootMakeAClaim();
    ccd.refuseCreate = 'PROPERTY_NOT_IN_ENGLAND';
    await app.post('/make-a-claim/claimant-type', { claimantType: 'PRIVATE_LANDLORD' });
    await app.post('/make-a-claim/trespass', { isTrespass: 'no' });
    await app.post('/make-a-claim/property-address', { ...PROPERTY, 'property-postcode': 'CF10 1AA' });

    const refused = await app.post('/make-a-claim/who-is-claiming', { whoIsClaiming: 'MYSELF' });

    expect(refused.location).toBe('/make-a-claim/property-ineligible');
    expect(text((await app.get('/make-a-claim/property-ineligible')).text)).toContain('property in England');
  });
});

describe('the task list', () => {
  it('shows each section with its status, and the rent arrears section only for a rent arrears claim', async () => {
    app = await bootMakeAClaim();
    givenClaim({ eligibility: ANSWERED_CLAIM.eligibility, grounds: { hasRentArrearsGrounds: 'NO' } });
    const page = text((await app.get(claimPath('task-list'))).text);
    expect(page).toContain('Check you’re eligible to use this service Done');
    expect(page).toContain('About you and your contact preferences Available');
    expect(page).toContain('Check your answers and submit Not available yet');
    expect(page).not.toContain('Proof of rent arrears');
  });

  it('opens checking your answers once every section is done', async () => {
    app = await bootMakeAClaim();
    givenClaim(ANSWERED_CLAIM);
    const page = text((await app.get(claimPath('task-list'))).text);
    expect(page).toContain('Proof of rent arrears In progress');
    givenClaim({
      ...ANSWERED_CLAIM,
      rentArrears: {
        ...ANSWERED_CLAIM.rentArrears,
        proofType: 'UPLOAD_STATEMENT',
        rentStatementDocuments: [{ value: { document: { document_filename: 'statement.pdf' } } }],
        moneyJudgmentWanted: 'NO',
        recoverySteps: '',
      },
    });
    expect(text((await app.get(claimPath('task-list'))).text)).toContain('Check your answers and submit Available');
  });
});

describe('every page renders', () => {
  it.each(['ledger', 'table'])('with the %s design', async design => {
    app = await bootMakeAClaim({ email: `pl-${design}-0001@example.test` });
    givenClaim({
      ...ANSWERED_CLAIM,
      rentArrears: {
        ...ANSWERED_CLAIM.rentArrears,
        proofType: design === 'table' ? 'TABLE' : 'LEDGER',
        rentDueDay: 1,
        rentHistoryLedger: [
          { value: { transactionDate: '2026-06-01', transactionTypes: ['RENT_CHARGE'], amountCharged: '100000' } },
        ],
        rentHistoryTable: [{ value: { periodStart: '2026-06-01', dateDue: '2026-06-01', amountDue: '100000' } }],
      },
    });
    const { stepRegistry } = await import('../../main/steps/make-a-claim/stepRegistry');
    const failures: string[] = [];
    for (const name of Object.keys(stepRegistry)) {
      const response = await app.get(`${claimPath(name)}?period=2026-06-01`);
      if (response.status !== 200) {
        failures.push(`${name}: ${response.status} ${text(response.text).slice(0, 200)}`);
      }
    }
    expect(failures).toEqual([]);
  });
});

describe('answering questions', () => {
  it('saves each answer to the draft and follows the branches the claimant chose', async () => {
    app = await bootMakeAClaim();
    givenClaim({ eligibility: ANSWERED_CLAIM.eligibility });

    expect(
      (await app.post(claimPath('individual-or-organisation'), { individualOrOrganisation: 'ORGANISATION' })).location
    ).toBe(`${claimPath('organisation-name')}?nav=1`);
    expect(storedClaim().claimant).toEqual({ individualOrOrganisation: 'ORGANISATION' });

    await app.post(claimPath('claimant-email'), { useAccountEmail: 'yes' });
    expect(storedClaim().claimant.emailAddress).toBe('pl-ledger-0001@example.test');

    expect((await app.post(claimPath('claimant-phone'), { contactByPhone: 'no' })).location).toBe(
      `${claimPath('multiple-claimants')}?nav=1`
    );
    expect((await app.post(claimPath('multiple-claimants'), { multipleClaimants: 'yes' })).location).toBe(
      claimPath('multiple-claimants-ineligible')
    );
    expect((await app.post(claimPath('claimant-cya'), {})).location).toBe(claimPath('task-list'));
  });

  it('shows the errors for a page left unanswered and saves nothing', async () => {
    app = await bootMakeAClaim();
    givenClaim({ eligibility: ANSWERED_CLAIM.eligibility });
    const saves = ccd.draftSaves.length;
    const page = await app.post(claimPath('rent-amount'), { rentAmount: 'lots' });
    expect(text(page.text)).toContain('Enter the rent as an amount of money');
    expect(ccd.draftSaves).toHaveLength(saves);
  });

  it('adds defendants one after another', async () => {
    app = await bootMakeAClaim();
    givenClaim(ANSWERED_CLAIM);
    const added = await app.post(claimPath('additional-defendants'), { additionalDefendants: 'yes' });
    expect(added.location).toBe(`${claimPath('defendant-name')}?index=1`);
    expect((await app.post(`${claimPath('defendant-name')}?index=1`, { nameKnown: 'no' })).location).toBe(
      `${claimPath('defendant-address')}?index=1`
    );
    await app.post(`${claimPath('defendant-address')}?index=1`, {
      sameAsProperty: 'no',
      'defendant-addressLine1': '2 Other Road',
      'defendant-town': 'Luton',
      'defendant-postcode': 'LU2 2BB',
    });
    expect(storedClaim().defendants).toHaveLength(2);
    expect(storedClaim().defendants[1].value).toEqual({
      nameKnown: 'NO',
      addressSameAsProperty: 'NO',
      addressKnown: 'YES',
      address: { AddressLine1: '2 Other Road', PostTown: 'Luton', PostCode: 'LU2 2BB' },
    });
    expect(text((await app.get(claimPath('defendant-cya'))).text)).toContain('Defendant 2 name Persons unknown');
  });
});

describe('proof of rent arrears with the ledger design', () => {
  it('adds transactions one at a time and keeps a running total of the arrears', async () => {
    app = await bootMakeAClaim({ email: 'pl-ledger-0002@example.test' });
    givenClaim(ANSWERED_CLAIM);
    const proof = text((await app.get(claimPath('arrears-proof'))).text);
    expect(proof).toContain('Enter the rent statement transactions one at a time');
    expect(proof).not.toContain('Create a rent statement from the rent due each period');

    expect((await app.post(claimPath('arrears-proof'), { proofType: 'LEDGER' })).location).toBe(
      `${claimPath('ledger-transaction')}?nav=1`
    );
    await app.post(claimPath('ledger-transaction'), {
      'transactionDate-day': '1',
      'transactionDate-month': '6',
      'transactionDate-year': '2026',
      transactionTypes: 'RENT_CHARGE',
      'transactionTypes.amountCharged': '500',
      description: 'June rent',
    });
    const another = await app.post(claimPath('ledger-summary'), { addAnother: 'yes' });
    expect(another.location).toBe(`${claimPath('ledger-transaction')}?entry=1`);
    await app.post(`${claimPath('ledger-transaction')}?entry=1`, {
      'transactionDate-day': '3',
      'transactionDate-month': '6',
      'transactionDate-year': '2026',
      transactionTypes: 'TENANT_PAYMENT',
      'transactionTypes.amountPaid': '120',
    });

    expect(storedClaim().rentArrears.rentHistoryLedger).toEqual([
      {
        value: {
          transactionDate: '2026-06-01',
          transactionTypes: ['RENT_CHARGE'],
          description: 'June rent',
          amountCharged: '50000',
        },
      },
      { value: { transactionDate: '2026-06-03', transactionTypes: ['TENANT_PAYMENT'], amountPaid: '12000' } },
    ]);
    const summary = text((await app.get(claimPath('ledger-summary'))).text);
    expect(summary).toContain('£500.00 £500.00');
    expect(summary).toContain('£120.00 £380.00');
    expect(summary).toContain('Total arrears: £380.00');
    expect((await app.post(claimPath('ledger-summary'), { addAnother: 'no' })).location).toBe(
      `${claimPath('money-judgment')}?nav=1`
    );
  });
});

describe('proof of rent arrears with the table design', () => {
  it('lays out the rent due each month and records payments against them', async () => {
    app = await bootMakeAClaim({ email: 'pl-table-0003@example.test' });
    givenClaim(ANSWERED_CLAIM);
    expect((await app.post(claimPath('rent-frequency'), { rentFrequency: 'MONTHLY' })).location).toBe(
      `${claimPath('rent-due-day')}?nav=1`
    );
    await app.post(claimPath('rent-due-day'), { rentDueDay: 1 });
    expect(text((await app.get(claimPath('arrears-proof'))).text)).not.toContain('one at a time');
    expect((await app.post(claimPath('arrears-proof'), { proofType: 'TABLE' })).location).toBe(
      `${claimPath('statement-period')}?nav=1`
    );
    await app.post(claimPath('statement-period'), {
      'statementStart-day': '1',
      'statementStart-month': '6',
      'statementStart-year': '2026',
      'statementEnd-day': '31',
      'statementEnd-month': '8',
      'statementEnd-year': '2026',
    });
    expect(
      storedClaim().rentArrears.rentHistoryTable.map((row: { value: { dateDue: string } }) => row.value.dateDue)
    ).toEqual(['2026-06-01', '2026-07-01', '2026-08-01']);

    await app.post(`${claimPath('rent-statement-payment')}?period=2026-06-01`, {
      'datePaid-day': '5',
      'datePaid-month': '6',
      'datePaid-year': '2026',
      amountPaid: '50',
    });
    await app.post(`${claimPath('rent-statement-payment')}?period=2026-06-01`, {
      'datePaid-day': '15',
      'datePaid-month': '6',
      'datePaid-year': '2026',
      amountPaid: '200',
    });

    const statement = text((await app.get(claimPath('rent-statement'))).text);
    expect(statement).toContain('1 June 2026 £1,000.00 5 June 2026 £50.00 £950.00');
    expect(statement).toContain('Additional payment 15 June 2026 £200.00 £750.00');
    expect(statement).toContain('Total arrears: £2,750.00');
  });

  it('falls back to the ledger for a design LaunchDarkly does not know', async () => {
    app = await bootMakeAClaim({ rentHistoryDesign: 'spreadsheet' });
    givenClaim(ANSWERED_CLAIM);
    expect(text((await app.get(claimPath('arrears-proof'))).text)).toContain('one at a time');
  });
});

describe('submitting the claim', () => {
  it('submits the whole claim with the statement of truth, then takes the claim fee by card', async () => {
    app = await bootMakeAClaim();
    givenClaim({
      ...ANSWERED_CLAIM,
      rentArrears: {
        ...ANSWERED_CLAIM.rentArrears,
        proofType: 'UPLOAD_STATEMENT',
        moneyJudgmentWanted: 'NO',
        recoverySteps: '',
      },
    });
    const cya = text((await app.get(claimPath('check-your-answers'))).text);
    expect(cya).toContain('Your name Billy Wright');
    expect(cya).toContain('Rent £1,000.00');

    const notAgreed = await app.post(claimPath('check-your-answers'), { statementOfTruth: 'belief' });
    expect(text(notAgreed.text)).toContain('Confirm both parts of the statement of truth');
    expect(text(notAgreed.text)).toContain('Enter your full name');

    const submitted = await app.post(claimPath('check-your-answers'), {
      statementOfTruth: ['contempt', 'belief'],
      statementOfTruthFullName: 'Billy Wright',
      statementOfTruthPosition: '',
    });
    expect(submitted.location).toBe(`/case/${CASE_REFERENCE}/pay-claim-fee`);
    expect(ccd.draftSaves.at(-1)).toMatchObject({
      event_data: {
        citizenPossessionClaim: {
          submission: { statementOfTruthAgreed: 'YES', statementOfTruthFullName: 'Billy Wright' },
          claimant: { firstName: 'Billy' },
        },
      },
    });
    expect(ccd.submissions[0]).toMatchObject({
      event: { id: 'citizenMakePossessionClaim' },
      data: { citizenPossessionClaim: { draftVersion: storedClaim().draftVersion } },
    });

    const pay = text((await app.get(`/case/${CASE_REFERENCE}/pay-claim-fee`)).text);
    expect(pay).toContain('Claim fee £404.00');
    const start = await app.get(`/case/${CASE_REFERENCE}/pay-claim-fee/start`);
    expect(start.location).toBe('https://card.payments.test/pay/1');
    expect(ccd.cardPayments).toEqual([
      expect.objectContaining({
        reference: '2026-1777027600017',
        amount: 404,
        returnUrl: 'https://pcs.test/payment/return',
      }),
    ]);

    const confirmation = text((await app.get(`/case/${CASE_REFERENCE}/claim-submitted?status=success`)).text);
    expect(confirmation).toContain('Claim submitted');
    expect(confirmation).toContain('1777 0276 0001 7761');
  });
});

describe('review fixes', () => {
  const SUBMITTABLE = {
    ...ANSWERED_CLAIM,
    rentArrears: {
      ...ANSWERED_CLAIM.rentArrears,
      proofType: 'UPLOAD_STATEMENT',
      moneyJudgmentWanted: 'NO',
      recoverySteps: '',
    },
  };
  const SIGNED = {
    statementOfTruth: ['contempt', 'belief'],
    statementOfTruthFullName: 'Billy Wright',
    statementOfTruthPosition: '',
  };

  it('sends the claimant back to check their answers when the claim changed elsewhere', async () => {
    app = await bootMakeAClaim();
    givenClaim(ANSWERED_CLAIM);
    ccd.changeDraftBeforeNextSave = true;
    const saved = await app.post(claimPath('rent-amount'), { rentAmount: '1200' });
    expect(saved.location).toBe(`${claimPath('check-your-answers')}?submitError=DRAFT_CHANGED`);
    const page = text((await app.get(saved.location as string)).text);
    expect(page).toContain('Your claim was changed in another tab or window');
  });

  it('shows each answer pcs-api refused at submit, linked to the page that asks it', async () => {
    app = await bootMakeAClaim();
    givenClaim(SUBMITTABLE);
    ccd.refuseSubmit = ['REQUIRED:claimant.address', 'REQUIRED:grounds.groundReasons.GROUND_14'];
    const refused = await app.post(claimPath('check-your-answers'), SIGNED);
    expect(refused.location).toBe(
      `${claimPath('check-your-answers')}?submitError=${encodeURIComponent('REQUIRED:claimant.address,REQUIRED:grounds.groundReasons.GROUND_14')}`
    );
    const page = new JSDOM((await app.get(refused.location as string)).text).window.document;
    const links = [...page.querySelectorAll('.govuk-error-summary a')].map(link => [
      link.textContent?.trim(),
      link.getAttribute('href'),
    ]);
    expect(links).toEqual([
      ['Answer the question on ‘What is your postal address?’', claimPath('claimant-address')],
      [
        'Answer the question on ‘Why are you making a claim on this ground?’',
        `${claimPath('ground-reason')}?ground=GROUND_14`,
      ],
    ]);
  });

  it('turns away a claim with other claimants at submit', async () => {
    app = await bootMakeAClaim();
    givenClaim(SUBMITTABLE);
    ccd.refuseSubmit = ['MULTIPLE_CLAIMANTS_NOT_ELIGIBLE'];
    expect((await app.post(claimPath('check-your-answers'), SIGNED)).location).toBe(
      claimPath('multiple-claimants-ineligible')
    );
  });

  it('keeps the statement of truth on Save for later', async () => {
    app = await bootMakeAClaim();
    givenClaim(SUBMITTABLE);
    await app.post(claimPath('check-your-answers'), { ...SIGNED, action: 'saveForLater' });
    expect(storedClaim().submission).toMatchObject({
      statementOfTruthAgreed: 'YES',
      statementOfTruthFullName: 'Billy Wright',
    });
    expect(ccd.submissions).toEqual([]);
  });

  it('keeps a saved answer when Save for later is pressed with an unreadable one', async () => {
    app = await bootMakeAClaim();
    givenClaim(ANSWERED_CLAIM);
    await app.post(claimPath('rent-amount'), { rentAmount: 'lots', action: 'saveForLater' });
    expect(storedClaim().rentArrears.rentAmount).toBe('100000');
  });

  it('shows the property without a way to change it', async () => {
    app = await bootMakeAClaim();
    givenClaim(SUBMITTABLE);
    const page = new JSDOM((await app.get(claimPath('check-your-answers'))).text).window.document;
    const property = page.querySelector('#summary-property');
    expect(property?.textContent).toContain('15 Garden Drive');
    expect(property?.textContent).toContain('You cannot change the property');
    expect(property?.querySelector('a')).toBeNull();
  });

  it('removes a defendant after asking, from a Remove link on the defendants summary', async () => {
    app = await bootMakeAClaim();
    givenClaim({
      ...ANSWERED_CLAIM,
      defendants: [
        ...ANSWERED_CLAIM.defendants,
        {
          value: {
            nameKnown: 'YES',
            firstName: 'Jo',
            lastName: 'Bloggs',
            addressSameAsProperty: 'YES',
            addressKnown: 'YES',
          },
        },
      ],
    });
    const summary = new JSDOM((await app.get(claimPath('defendant-cya'))).text).window.document;
    const remove = [...summary.querySelectorAll('a')].find(link => link.textContent?.startsWith('Remove'));
    expect(remove?.getAttribute('href')).toBe(`${claimPath('remove-defendant')}?index=1`);
    expect(text((await app.get(`${claimPath('remove-defendant')}?index=1`)).text)).toContain(
      'Are you sure you want to remove Jo Bloggs from the claim?'
    );
    expect((await app.post(`${claimPath('remove-defendant')}?index=1`, { confirmRemove: 'yes' })).location).toBe(
      claimPath('defendant-cya')
    );
    expect(storedClaim().defendants).toHaveLength(1);
  });

  it('removes a ledger transaction after asking', async () => {
    app = await bootMakeAClaim();
    givenClaim({
      ...ANSWERED_CLAIM,
      rentArrears: {
        ...ANSWERED_CLAIM.rentArrears,
        proofType: 'LEDGER',
        rentHistoryLedger: [
          { value: { transactionDate: '2026-06-01', transactionTypes: ['RENT_CHARGE'], amountCharged: '100000' } },
          { value: { transactionDate: '2026-06-03', transactionTypes: ['TENANT_PAYMENT'], amountPaid: '12000' } },
        ],
      },
    });
    const ledger = text((await app.get(claimPath('ledger-summary'))).text);
    expect(ledger).toContain('Remove transaction 2');
    await app.post(`${claimPath('remove-ledger-entry')}?entry=1`, { confirmRemove: 'no' });
    expect(storedClaim().rentArrears.rentHistoryLedger).toHaveLength(2);
    expect((await app.post(`${claimPath('remove-ledger-entry')}?entry=1`, { confirmRemove: 'yes' })).location).toBe(
      claimPath('ledger-summary')
    );
    expect(storedClaim().rentArrears.rentHistoryLedger).toHaveLength(1);
  });

  it('asks for a reason for each ground chosen, one page each, and shows them on the summary', async () => {
    app = await bootMakeAClaim();
    givenClaim({ ...ANSWERED_CLAIM, grounds: { hasRentArrearsGrounds: 'NO' } });
    expect(
      (await app.post(claimPath('other-grounds'), { mandatoryGrounds: 'GROUND_1A', discretionaryGrounds: 'GROUND_14' }))
        .location
    ).toBe(`${claimPath('ground-reason')}?nav=1`);
    expect(text((await app.get(claimPath('ground-reason'))).text)).toContain(
      'Why are you making a claim for possession under Sale of dwelling house (Ground 1A)?'
    );
    expect((await app.post(claimPath('ground-reason'), { groundReason: 'Selling' })).location).toBe(
      `${claimPath('ground-reason')}?ground=GROUND_14`
    );
    expect((await app.post(`${claimPath('ground-reason')}?ground=GROUND_14`, { groundReason: 'Noise' })).location).toBe(
      `${claimPath('tenancy-cya')}?nav=1`
    );
    expect(storedClaim().grounds.groundReasons).toEqual([
      { value: { ground: 'GROUND_1A', reason: 'Selling' } },
      { value: { ground: 'GROUND_14', reason: 'Noise' } },
    ]);
    expect(text((await app.get(claimPath('tenancy-cya'))).text)).toContain(
      'Why you are claiming under Antisocial behaviour (Ground 14) Noise'
    );
  });

  it('never starts a second payment for a claim already paid', async () => {
    app = await bootMakeAClaim();
    givenClaim({ submission: { serviceRequestReference: 'SR-1', feeAmount: '40400', paymentStatus: 'PAID' } });
    expect((await app.get(`/case/${CASE_REFERENCE}/pay-claim-fee`)).location).toBe(
      `/case/${CASE_REFERENCE}/claim-submitted`
    );
    expect((await app.get(`/case/${CASE_REFERENCE}/pay-claim-fee/start`)).location).toBe(
      `/case/${CASE_REFERENCE}/claim-submitted`
    );
    expect(ccd.cardPayments).toEqual([]);
  });
});
