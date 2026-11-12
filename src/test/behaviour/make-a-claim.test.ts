/**
 * @jest-environment node
 */
import { JSDOM } from 'jsdom';

import { todayInLondon } from '../../main/utils/formatLocalisedDate';

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

const ALL_SECTION_CYAS = ['claimant-cya', 'defendant-cya', 'tenancy-cya', 'notice-cya', 'arrears-cya', 'situation-cya'];

/** Every question answered but the proof of rent arrears, and every section summary continued from. */
const ANSWERED_CLAIM = {
  confirmedSections: ALL_SECTION_CYAS,
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
  defendantsConfirmed: 'YES',
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

const STATEMENT_DOCUMENTS = [{ value: { document: { document_filename: 'statement.pdf' } } }];

/** A claim with every section done, so check your answers is open. */
const COMPLETE_CLAIM = {
  ...ANSWERED_CLAIM,
  rentArrears: {
    ...ANSWERED_CLAIM.rentArrears,
    proofType: 'UPLOAD_STATEMENT',
    rentStatementDocuments: STATEMENT_DOCUMENTS,
    moneyJudgmentWanted: 'NO',
    recoverySteps: '',
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

  it('asks the country again for a cross-border property in a later claim', async () => {
    app = await bootMakeAClaim();
    ccd.refuseCreate = 'LEGISLATIVE_COUNTRY_REQUIRED';
    await app.post('/make-a-claim/claimant-type', { claimantType: 'PRIVATE_LANDLORD' });
    await app.post('/make-a-claim/trespass', { isTrespass: 'no' });
    await app.post('/make-a-claim/property-address', PROPERTY);
    await app.post('/make-a-claim/who-is-claiming', { whoIsClaiming: 'MYSELF' });
    expect((await app.post('/make-a-claim/property-country', { legislativeCountry: 'England' })).location).toBe(
      claimPath('eligible')
    );
    ccd.stored!.state = 'PENDING_CASE_ISSUED';

    await app.get('/make-a-claim');
    await app.post('/make-a-claim/claimant-type', { claimantType: 'PRIVATE_LANDLORD' });
    await app.post('/make-a-claim/trespass', { isTrespass: 'no' });
    await app.post('/make-a-claim/property-address', { ...PROPERTY, 'property-addressLine1': '17 Garden Drive' });
    expect((await app.post('/make-a-claim/who-is-claiming', { whoIsClaiming: 'MYSELF' })).location).toBe(
      '/make-a-claim/property-country'
    );
  });

  it("carries on with the claimant's own draft claim instead of creating another", async () => {
    app = await bootMakeAClaim();
    givenClaim(ANSWERED_CLAIM);
    await app.post('/make-a-claim/claimant-type', { claimantType: 'PRIVATE_LANDLORD' });
    await app.post('/make-a-claim/trespass', { isTrespass: 'no' });
    await app.post('/make-a-claim/property-address', PROPERTY);

    expect((await app.post('/make-a-claim/who-is-claiming', { whoIsClaiming: 'MYSELF' })).location).toBe(
      claimPath('task-list')
    );
    expect(ccd.createRequests).toEqual([]);
    expect(ccd.searches).toEqual([
      expect.objectContaining({
        ctid: 'PCS',
        query: { bool: { filter: [{ match: { state: 'AWAITING_SUBMISSION_TO_HMCTS' } }] } },
      }),
    ]);
  });

  it('creates the claim anyway when the search for a draft claim fails', async () => {
    app = await bootMakeAClaim();
    givenClaim(ANSWERED_CLAIM);
    ccd.searchFails = true;
    await app.post('/make-a-claim/claimant-type', { claimantType: 'PRIVATE_LANDLORD' });
    await app.post('/make-a-claim/trespass', { isTrespass: 'no' });
    await app.post('/make-a-claim/property-address', PROPERTY);

    expect((await app.post('/make-a-claim/who-is-claiming', { whoIsClaiming: 'MYSELF' })).location).toBe(
      claimPath('eligible')
    );
    expect(ccd.createRequests).toHaveLength(1);
  });

  it('stops a double click on the buttons that create the claim', async () => {
    app = await bootMakeAClaim();
    await app.post('/make-a-claim/claimant-type', { claimantType: 'PRIVATE_LANDLORD' });
    await app.post('/make-a-claim/trespass', { isTrespass: 'no' });
    await app.post('/make-a-claim/property-address', PROPERTY);
    ccd.refuseCreate = 'LEGISLATIVE_COUNTRY_REQUIRED';
    await app.post('/make-a-claim/who-is-claiming', { whoIsClaiming: 'MYSELF' });
    for (const page of ['/make-a-claim/who-is-claiming', '/make-a-claim/property-country']) {
      const shown = await app.get(page);
      expect(shown.status).toBe(200);
      const form = new JSDOM(shown.text).window.document;
      expect(form.querySelector('button[value="continue"]')?.getAttribute('data-prevent-double-click')).toBe('true');
    }
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

  describe('checking the property as soon as the claimant gives it', () => {
    const giveProperty = async (): Promise<string | undefined> => {
      await app.post('/make-a-claim/claimant-type', { claimantType: 'PRIVATE_LANDLORD' });
      await app.post('/make-a-claim/trespass', { isTrespass: 'no' });
      return (await app.post('/make-a-claim/property-address', PROPERTY)).location;
    };

    it.each([
      ['ELIGIBLE', '/make-a-claim/who-is-claiming'],
      ['NOT_COVERED', '/make-a-claim/property-not-covered'],
      ['NOT_ENGLAND', '/make-a-claim/property-ineligible'],
      ['LEGISLATIVE_COUNTRY_REQUIRED', '/make-a-claim/property-country'],
    ])('sends a property pcs-api finds %s to %s', async (status, page) => {
      app = await bootMakeAClaim();
      ccd.propertyEligibility = status;
      expect(await giveProperty()).toBe(page);
      expect(ccd.eligibilityChecks).toEqual([{ postcode: 'LU1 1AB' }]);
      expect(ccd.createRequests).toEqual([]);
    });

    it('goes on to who is claiming when the check fails, leaving it to the claim’s creation', async () => {
      app = await bootMakeAClaim();
      ccd.propertyEligibility = 503;
      expect(await giveProperty()).toBe('/make-a-claim/who-is-claiming');
    });

    it('checks a cross-border property again once the claimant says it is in England', async () => {
      app = await bootMakeAClaim();
      ccd.propertyEligibility = 'LEGISLATIVE_COUNTRY_REQUIRED';
      await giveProperty();
      ccd.propertyEligibility = 'NOT_COVERED';
      expect((await app.post('/make-a-claim/property-country', { legislativeCountry: 'England' })).location).toBe(
        '/make-a-claim/property-not-covered'
      );
      expect(ccd.eligibilityChecks[1]).toEqual({ postcode: 'LU1 1AB', legislativeCountry: 'England' });
      expect(ccd.createRequests).toEqual([]);
    });

    it('asks who is claiming after an eligible cross-border property in England, then creates the claim', async () => {
      app = await bootMakeAClaim();
      ccd.propertyEligibility = 'LEGISLATIVE_COUNTRY_REQUIRED';
      expect(await giveProperty()).toBe('/make-a-claim/property-country');
      expect((await app.get('/make-a-claim/property-country')).status).toBe(200);
      ccd.propertyEligibility = 'ELIGIBLE';
      expect((await app.post('/make-a-claim/property-country', { legislativeCountry: 'England' })).location).toBe(
        '/make-a-claim/who-is-claiming'
      );
      expect(ccd.createRequests).toEqual([]);
      expect((await app.post('/make-a-claim/who-is-claiming', { whoIsClaiming: 'MYSELF' })).location).toBe(
        claimPath('eligible')
      );
      expect(ccd.createRequests[0].data.citizenPossessionClaim.eligibility.legislativeCountry).toBe('England');
    });

    it('turns away a property in Wales without checking it again', async () => {
      app = await bootMakeAClaim();
      ccd.propertyEligibility = 'LEGISLATIVE_COUNTRY_REQUIRED';
      await giveProperty();
      expect((await app.post('/make-a-claim/property-country', { legislativeCountry: 'Wales' })).location).toBe(
        '/make-a-claim/property-ineligible'
      );
      expect(ccd.eligibilityChecks).toHaveLength(1);
    });
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
        rentStatementDocuments: STATEMENT_DOCUMENTS,
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
        moneyJudgmentWanted: 'NO',
        recoverySteps: '',
        rentHistoryLedger: [
          { value: { transactionDate: '2026-06-01', transactionTypes: ['RENT_CHARGE'], amountCharged: '100000' } },
        ],
        rentHistoryTable: [
          {
            value: {
              periodStart: '2026-06-01',
              dateDue: '2026-06-01',
              amountDue: '100000',
              datePaid: '2026-06-02',
              amountPaid: '50000',
            },
          },
        ],
      },
    });
    const { stepRegistry } = await import('../../main/steps/make-a-claim/stepRegistry');
    // No ground needs a reason in this claim, so the reason page sends the claimant to the grounds instead.
    const redirected: Record<string, string> = { 'ground-reason': claimPath('other-grounds') };
    const failures: string[] = [];
    for (const name of Object.keys(stepRegistry)) {
      const response = await app.get(
        `${claimPath(name)}?period=2026-06-01&row=0&datePaid=2026-06-02&amountPaid=50000&index=0&entry=0`
      );
      if (redirected[name] ? response.location !== redirected[name] : response.status !== 200) {
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
      `${claimPath('claimant-text-message')}?nav=1`
    );
    expect((await app.post(claimPath('multiple-claimants'), { multipleClaimants: 'yes' })).location).toBe(
      claimPath('multiple-claimants-ineligible')
    );
    expect((await app.post(claimPath('claimant-cya'), {})).location).toBe(claimPath('task-list'));
  });

  describe('the text message number', () => {
    const page = async (): Promise<string> => text((await app.get(claimPath('claimant-text-message'))).text);

    it('is optional when the claimant gave a phone number', async () => {
      app = await bootMakeAClaim();
      givenClaim({ claimant: { contactByPhone: 'YES', phoneNumber: '07700900982' } });
      expect(await page()).toContain('Mobile phone number, if different from the number you gave (optional)');
      const saved = await app.post(claimPath('claimant-text-message'), { contactByText: 'yes' });
      expect(saved.status).toBe(303);
      expect(storedClaim().claimant).toMatchObject({ contactByText: 'YES', phoneNumber: '07700900982' });
    });

    it('is required when the claimant does not want calls', async () => {
      app = await bootMakeAClaim();
      givenClaim({ claimant: { contactByPhone: 'NO' } });
      expect(await page()).toContain('to this number');
      expect(await page()).not.toContain('if different');

      const refused = await app.post(claimPath('claimant-text-message'), { contactByText: 'yes' });
      expect(text(refused.text)).toContain('Enter a mobile phone number');
      expect(storedClaim().claimant).toEqual({ contactByPhone: 'NO' });

      await app.post(claimPath('claimant-text-message'), {
        contactByText: 'yes',
        'contactByText.textMessageNumber': '07700900111',
      });
      expect(storedClaim().claimant).toEqual({
        contactByPhone: 'NO',
        contactByText: 'YES',
        textMessageNumber: '07700900111',
      });
    });
  });

  it('refuses an individual’s name longer together than pcs-api can keep', async () => {
    app = await bootMakeAClaim();
    givenClaim({ eligibility: ANSWERED_CLAIM.eligibility });
    const saves = ccd.draftSaves.length;
    const page = await app.post(claimPath('claimant-name'), { firstName: 'A'.repeat(30), lastName: 'B'.repeat(30) });
    expect(text(page.text)).toContain('Your first and last name together must be 60 characters or fewer');
    expect(ccd.draftSaves).toHaveLength(saves);
    expect(
      (await app.post(claimPath('claimant-name'), { firstName: 'A'.repeat(29), lastName: 'B'.repeat(30) })).status
    ).toBe(303);
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

  it('leaves the defendants in progress until the claimant says there are no more to add and confirms them', async () => {
    app = await bootMakeAClaim();
    givenClaim({ eligibility: ANSWERED_CLAIM.eligibility });
    await app.post(claimPath('defendant-name'), { nameKnown: 'no' });
    await app.post(claimPath('defendant-address'), { sameAsProperty: 'yes', action: 'saveForLater' });
    expect(text((await app.get(claimPath('task-list'))).text)).toContain('About the defendants In progress');

    await app.post(claimPath('additional-defendants'), { additionalDefendants: 'no' });
    expect(storedClaim().defendantsConfirmed).toBe('YES');
    expect(text((await app.get(claimPath('task-list'))).text)).toContain('About the defendants In progress');
    await app.post(claimPath('defendant-cya'), {});
    expect(text((await app.get(claimPath('task-list'))).text)).toContain('About the defendants Done');

    await app.post(claimPath('additional-defendants'), { additionalDefendants: 'yes' });
    await app.post(`${claimPath('defendant-name')}?index=1`, { nameKnown: 'no' });
    expect(storedClaim().defendantsConfirmed).toBe('NO');
    expect(text((await app.get(claimPath('task-list'))).text)).toContain('About the defendants In progress');
  });

  it('keeps the defendants done when the claimant comes back in a new session', async () => {
    app = await bootMakeAClaim();
    givenClaim(ANSWERED_CLAIM);
    expect(text((await app.get(claimPath('task-list'))).text)).toContain('About the defendants Done');
    const form = new JSDOM((await app.get(claimPath('additional-defendants'))).text).window.document;
    expect(form.querySelector<HTMLInputElement>('input[name="additionalDefendants"][value="no"]')?.checked).toBe(true);
  });

  it('leaves the defendants in progress while another defendant’s address is unanswered', async () => {
    app = await bootMakeAClaim();
    givenClaim({
      ...ANSWERED_CLAIM,
      defendants: [...ANSWERED_CLAIM.defendants, { value: { nameKnown: 'NO' } }],
      additionalDefendants: 'YES',
    });
    expect(text((await app.get(claimPath('task-list'))).text)).toContain('About the defendants In progress');
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
        id: expect.any(String),
        value: {
          transactionDate: '2026-06-01',
          transactionTypes: ['RENT_CHARGE'],
          description: 'June rent',
          amountCharged: '50000',
        },
      },
      {
        id: expect.any(String),
        value: { transactionDate: '2026-06-03', transactionTypes: ['TENANT_PAYMENT'], amountPaid: '12000' },
      },
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
    givenClaim(COMPLETE_CLAIM);
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
  const SUBMITTABLE = COMPLETE_CLAIM;
  const SIGNED = {
    statementOfTruth: ['contempt', 'belief'],
    statementOfTruthFullName: 'Billy Wright',
    statementOfTruthPosition: '',
  };

  it('refuses a save from a page loaded before another tab saved, by the version the page showed', async () => {
    app = await bootMakeAClaim();
    givenClaim(ANSWERED_CLAIM);
    const page = new JSDOM((await app.get(claimPath('rent-amount'))).text).window.document;
    const shown = page.querySelector<HTMLInputElement>('input[name="draftVersion"]')?.value;
    expect(shown).toBe('1');
    await app.post(claimPath('language-used'), { languageUsed: 'WELSH', draftVersion: '1' });
    const stale = await app.post(claimPath('rent-amount'), { rentAmount: '1200', draftVersion: shown as string });
    expect(stale.location).toBe(`${claimPath('check-your-answers')}?submitError=DRAFT_CHANGED`);
    expect(storedClaim().rentArrears.rentAmount).toBe('100000');
  });

  it('takes a double-clicked page as one save, not a change made elsewhere', async () => {
    app = await bootMakeAClaim();
    givenClaim(ANSWERED_CLAIM);
    const [first, second] = await Promise.all([
      app.post(claimPath('rent-amount'), { rentAmount: '1200', draftVersion: '1' }),
      app.post(claimPath('rent-amount'), { rentAmount: '1200', draftVersion: '1' }),
    ]);
    expect([first.location, second.location]).toEqual([
      `${claimPath('rent-frequency')}?nav=1`,
      `${claimPath('rent-frequency')}?nav=1`,
    ]);
    expect(storedClaim().rentArrears.rentAmount).toBe('120000');
  });

  it('asks for a different email address up front when the account one is too long to keep', async () => {
    app = await bootMakeAClaim({ email: `pl-ledger-${'x'.repeat(250)}@example.test` });
    givenClaim(ANSWERED_CLAIM);
    const page = new JSDOM((await app.get(claimPath('claimant-email'))).text).window.document;
    expect(page.body.textContent).toContain('The email address on your account is too long for us to use');
    expect(
      [...page.querySelectorAll('input[name="useAccountEmail"]')].map(input => (input as HTMLInputElement).value)
    ).toEqual(['no']);
    await app.post(claimPath('claimant-email'), {
      useAccountEmail: 'no',
      'useAccountEmail.emailAddress': 'short@example.test',
    });
    expect(storedClaim().claimant).toMatchObject({ contactByEmail: 'NO', emailAddress: 'short@example.test' });
  });

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
      [
        'Answer the question on ‘What is your postal address?’',
        `${claimPath('claimant-address')}?returnTo=check-your-answers`,
      ],
      [
        'Answer the question on ‘Why are you making a claim on this ground?’',
        `${claimPath('ground-reason')}?ground=GROUND_14&returnTo=check-your-answers`,
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
    expect(remove?.getAttribute('href')).toBe(`${claimPath('remove-defendant')}?index=1&returnTo=defendant-cya`);
    expect(text((await app.get(`${claimPath('remove-defendant')}?index=1`)).text)).toContain(
      'Are you sure you want to remove Jo Bloggs from the claim?'
    );
    expect((await app.post(`${claimPath('remove-defendant')}?index=1`, { confirmRemove: 'yes' })).location).toBe(
      claimPath('defendant-cya')
    );
    expect(storedClaim().defendants).toHaveLength(1);
    expect(text((await app.get(claimPath('task-list'))).text)).toContain('About the defendants In progress');
    await app.post(claimPath('defendant-cya'), {});
    expect(text((await app.get(claimPath('task-list'))).text)).toContain('About the defendants Done');
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
    expect(storedClaim().confirmedSections).toContain('arrears-cya');
    expect((await app.post(`${claimPath('remove-ledger-entry')}?entry=1`, { confirmRemove: 'yes' })).location).toBe(
      claimPath('ledger-summary')
    );
    expect(storedClaim().rentArrears.rentHistoryLedger).toHaveLength(1);
    expect(storedClaim().confirmedSections).not.toContain('arrears-cya');
    expect(storedClaim().confirmedSections).toContain('defendant-cya');
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
      { id: expect.any(String), value: { ground: 'GROUND_1A', reason: 'Selling' } },
      { id: expect.any(String), value: { ground: 'GROUND_14', reason: 'Noise' } },
    ]);
    expect(text((await app.get(claimPath('tenancy-cya'))).text)).toContain(
      'Why you are claiming under Antisocial behaviour (Ground 14) Noise'
    );
  });

  it('sends a second click on Submit to the claim fee rather than an error', async () => {
    app = await bootMakeAClaim();
    givenClaim(SUBMITTABLE);
    expect((await app.post(claimPath('check-your-answers'), SIGNED)).location).toBe(
      `/case/${CASE_REFERENCE}/pay-claim-fee`
    );
    expect((await app.post(claimPath('check-your-answers'), SIGNED)).location).toBe(
      `/case/${CASE_REFERENCE}/pay-claim-fee`
    );
    expect(ccd.submissions).toHaveLength(1);
  });

  it('shows a draft claim’s task list, not the submitted confirmation', async () => {
    app = await bootMakeAClaim();
    givenClaim(SUBMITTABLE);
    expect((await app.get(`/case/${CASE_REFERENCE}/claim-submitted`)).location).toBe(claimPath('task-list'));
  });

  it('accepts today on every date that has to be today or in the past', async () => {
    app = await bootMakeAClaim();
    givenClaim({
      ...ANSWERED_CLAIM,
      rentArrears: {
        ...ANSWERED_CLAIM.rentArrears,
        proofType: 'TABLE',
        rentHistoryTable: [{ value: { periodStart: '2026-06-01', dateDue: '2026-06-01', amountDue: '100000' } }],
      },
    });
    const [year, month, day] = todayInLondon().split('-');
    const today = { day, month, year };
    const parts = (name: string) => ({
      [`${name}-day`]: today.day,
      [`${name}-month`]: today.month,
      [`${name}-year`]: today.year,
    });
    const pages: [string, Record<string, string | string[]>][] = [
      ['tenancy-start-date', parts('tenancyStartDate')],
      ['notice-date', parts('noticeDate')],
      [
        'ledger-transaction',
        { ...parts('transactionDate'), transactionTypes: 'RENT_CHARGE', 'transactionTypes.amountCharged': '10' },
      ],
      ['rent-statement-payment?period=2026-06-01', { ...parts('datePaid'), amountPaid: '10' }],
    ];
    for (const [page, body] of pages) {
      expect([page, (await app.post(claimPath(page), body)).status]).toEqual([page, 303]);
    }
  });

  describe('back from GOV.UK Pay', () => {
    const FEE = { submission: { serviceRequestReference: 'SR-1', feeAmount: '40400' } };
    const SUBMITTED = 'PENDING_CASE_ISSUED';

    it('shows the claim submitted once the card payment went through, and never offers the fee again', async () => {
      app = await bootMakeAClaim();
      givenClaim(FEE, SUBMITTED);
      await app.get(`/case/${CASE_REFERENCE}/pay-claim-fee/start`);
      const back = await app.get('/payment/return/RC-1111/confirmation');
      expect(back.location).toBe(`/case/${CASE_REFERENCE}/claim-submitted?status=success`);
      const page = text((await app.get(back.location as string)).text);
      expect(page).toContain('Claim submitted');
      expect(page).toContain('1777 0276 0001 7761');
      expect((await app.get(`/case/${CASE_REFERENCE}/pay-claim-fee`)).location).toBe(
        `/case/${CASE_REFERENCE}/claim-submitted`
      );
    });

    it('says the payment is being processed while GOV.UK Pay has not finished it', async () => {
      app = await bootMakeAClaim();
      givenClaim(FEE, SUBMITTED);
      ccd.cardPaymentStatus = 'Initiated';
      await app.get(`/case/${CASE_REFERENCE}/pay-claim-fee/start`);
      const back = await app.get('/payment/return/RC-1111/confirmation');
      expect(back.location).toBe(`/case/${CASE_REFERENCE}/claim-submitted?status=pending`);
      expect(text((await app.get(back.location as string)).text)).toContain('Your payment is being processed');
      expect((await app.get(`/case/${CASE_REFERENCE}/pay-claim-fee`)).status).toBe(200);
    });

    it('offers the payment again after a declined card', async () => {
      app = await bootMakeAClaim();
      givenClaim(FEE, SUBMITTED);
      ccd.cardPaymentStatus = 'Failed';
      await app.get(`/case/${CASE_REFERENCE}/pay-claim-fee/start`);
      const back = await app.get('/payment/return/RC-1111/confirmation');
      expect(back.location).toBe(`/case/${CASE_REFERENCE}/pay-claim-fee?payment=failed`);
      const page = text((await app.get(back.location as string)).text);
      expect(page).toContain('Your payment was not successful');
      expect(page).toContain('Pay your claim fee');
    });
  });

  it('never starts a second payment for a claim already paid', async () => {
    app = await bootMakeAClaim();
    givenClaim(
      { submission: { serviceRequestReference: 'SR-1', feeAmount: '40400', paymentStatus: 'PAID' } },
      'CASE_ISSUED'
    );
    expect((await app.get(`/case/${CASE_REFERENCE}/pay-claim-fee`)).location).toBe(
      `/case/${CASE_REFERENCE}/claim-submitted`
    );
    expect((await app.get(`/case/${CASE_REFERENCE}/pay-claim-fee/start`)).location).toBe(
      `/case/${CASE_REFERENCE}/claim-submitted`
    );
    expect(ccd.cardPayments).toEqual([]);
  });
});

describe('build observation fixes', () => {
  const page = async (path: string) => new JSDOM((await app.get(path)).text).window.document;
  const backLink = (document: Document) => document.querySelector('.govuk-back-link')?.getAttribute('href');
  const TABLE_CLAIM = {
    ...ANSWERED_CLAIM,
    rentArrears: {
      ...ANSWERED_CLAIM.rentArrears,
      rentDueDay: 1,
      proofType: 'TABLE',
      rentHistoryTable: [
        {
          value: {
            periodStart: '2026-06-01',
            dateDue: '2026-06-01',
            amountDue: '100000',
            datePaid: '2026-06-05',
            amountPaid: '5000',
          },
        },
        { value: { periodStart: '2026-06-01', datePaid: '2026-06-15', amountPaid: '20000' } },
        { value: { periodStart: '2026-07-01', dateDue: '2026-07-01', amountDue: '100000' } },
      ],
    },
  };
  const removePaymentPath = (row: number, datePaid: string, amountPaid: string) =>
    `${claimPath('remove-rent-payment')}?row=${row}&datePaid=${datePaid}&amountPaid=${amountPaid}`;

  it('prefixes the page title with "Error: " only when the page shows errors', async () => {
    app = await bootMakeAClaim();
    givenClaim(ANSWERED_CLAIM);
    expect((await page(claimPath('tenancy-start-date'))).title).toMatch(/^When did the tenancy or licence begin\?/);
    const refused = await app.post(claimPath('tenancy-start-date'), {});
    expect(new JSDOM(refused.text).window.document.title).toMatch(/^Error: When did the tenancy or licence begin\?/);
  });

  it('returns to the summary a Change link came from, unless the change asks a new question', async () => {
    app = await bootMakeAClaim();
    givenClaim(ANSWERED_CLAIM);
    const summary = await page(claimPath('claimant-cya'));
    const change = [...summary.querySelectorAll('.govuk-summary-list a')].map(link => link.getAttribute('href'));
    expect(change).toContain(`${claimPath('claimant-name')}?returnTo=claimant-cya`);

    const changed = await app.post(`${claimPath('claimant-name')}?returnTo=claimant-cya`, {
      firstName: 'Bill',
      lastName: 'Wright',
    });
    expect(changed.location).toBe(claimPath('claimant-cya'));

    const opened = await app.post(`${claimPath('tenancy-agreement')}?returnTo=tenancy-cya`, {
      tenancyAgreementAvailable: 'yes',
    });
    expect(opened.location).toBe(`${claimPath('upload-tenancy-agreement')}?returnTo=tenancy-cya`);
  });

  it("returns to the defendants summary after changing a later defendant, but asks a new one's address", async () => {
    app = await bootMakeAClaim();
    givenClaim({
      ...ANSWERED_CLAIM,
      defendants: [
        ...ANSWERED_CLAIM.defendants,
        { value: { nameKnown: 'NO', addressKnown: 'YES', addressSameAsProperty: 'YES' } },
      ],
    });
    const changed = await app.post(`${claimPath('defendant-name')}?index=1&returnTo=defendant-cya`, {
      nameKnown: 'no',
    });
    expect(changed.location).toBe(claimPath('defendant-cya'));
    const added = await app.post(`${claimPath('defendant-name')}?index=2&returnTo=defendant-cya`, { nameKnown: 'no' });
    expect(added.location).toBe(`${claimPath('defendant-address')}?index=2&returnTo=defendant-cya`);
  });

  it('ignores a returnTo that is not one of the journey summaries', async () => {
    app = await bootMakeAClaim();
    givenClaim(ANSWERED_CLAIM);
    const changed = await app.post(`${claimPath('claimant-name')}?returnTo=https://example.com`, {
      firstName: 'Bill',
      lastName: 'Wright',
    });
    expect(changed.location).toBe(`${claimPath('claimant-address')}?nav=1`);
  });

  it('sends check your answers to the first unanswered question while sections are unfinished', async () => {
    app = await bootMakeAClaim();
    givenClaim(ANSWERED_CLAIM);
    expect((await app.get(claimPath('check-your-answers'))).location).toBe(claimPath('arrears-proof'));
    givenClaim(COMPLETE_CLAIM);
    expect((await app.get(claimPath('check-your-answers'))).status).toBe(200);
  });

  it('shows the statement of truth again after Save for later', async () => {
    app = await bootMakeAClaim();
    givenClaim({
      ...COMPLETE_CLAIM,
      submission: {
        statementOfTruthAgreed: 'YES',
        statementOfTruthFullName: 'Billy Wright',
        statementOfTruthPosition: 'Director',
      },
    });
    const document = await page(claimPath('check-your-answers'));
    expect(
      [...document.querySelectorAll<HTMLInputElement>('input[name="statementOfTruth"]')].map(box => box.checked)
    ).toEqual([true, true]);
    expect(document.querySelector<HTMLInputElement>('input[name="statementOfTruthFullName"]')?.value).toBe(
      'Billy Wright'
    );
    expect(document.querySelector<HTMLInputElement>('input[name="statementOfTruthPosition"]')?.value).toBe('Director');
  });

  it('keeps a blank optional answer unanswered on Save for later, and answered on Save and continue', async () => {
    app = await bootMakeAClaim();
    givenClaim(ANSWERED_CLAIM);
    await app.post(claimPath('recovery-steps'), { recoverySteps: '', action: 'saveForLater' });
    expect(storedClaim().rentArrears.recoverySteps).toBeUndefined();
    await app.post(claimPath('recovery-steps'), { recoverySteps: '' });
    expect(storedClaim().rentArrears.recoverySteps).toBe('');

    await app.post(claimPath('upload-other-documents'), { action: 'saveForLater' });
    expect(storedClaim().otherInformation.otherDocuments).toEqual([]);
    givenClaim({
      ...ANSWERED_CLAIM,
      otherInformation: { ...ANSWERED_CLAIM.otherInformation, otherDocuments: undefined },
    });
    await app.post(claimPath('upload-other-documents'), { action: 'saveForLater' });
    expect(storedClaim().otherInformation.otherDocuments).toBeUndefined();
  });

  it('names a field briefly in the emoji error', async () => {
    app = await bootMakeAClaim();
    givenClaim(ANSWERED_CLAIM);
    const refused = await app.post(claimPath('defendant-circumstances'), { defendantCircumstances: 'Fine 😀' });
    expect(text(refused.text)).toContain(
      'The defendants’ circumstances must only include letters a to z, and special characters such as hyphens, spaces and apostrophes'
    );
  });

  it('checks the format of the email address the notice was sent to, and names each method in its date errors', async () => {
    app = await bootMakeAClaim();
    givenClaim(ANSWERED_CLAIM);
    const refused = text(
      (
        await app.post(claimPath('notice-method'), {
          noticeMethods: ['FIRST_CLASS_POST', 'EMAIL'],
          'noticeMethods.emailedTo': 'not-an-email',
        })
      ).text
    );
    expect(refused).toContain('Enter an email address in the correct format, like name@example.com');
    expect(refused).toContain('Enter the date the notice was posted');
    expect(refused).toContain('Enter the date the email was sent');
  });

  it('keeps the defendant on the Back links of a later defendant, and lists defendants under the H1', async () => {
    app = await bootMakeAClaim();
    givenClaim(ANSWERED_CLAIM);
    expect(backLink(await page(`${claimPath('defendant-name')}?index=1`))).toBe(claimPath('additional-defendants'));
    expect(backLink(await page(`${claimPath('defendant-address')}?index=1`))).toBe(
      `${claimPath('defendant-name')}?index=1`
    );
    const additional = await page(claimPath('additional-defendants'));
    const headings = [...additional.querySelectorAll('h1, h2')].map(heading => heading.textContent?.trim());
    expect(headings.indexOf('Do you need to add another defendant?')).toBeLessThan(
      headings.indexOf('Defendants you’ve added')
    );
  });

  it('opens the manual address when it holds a saved address', async () => {
    app = await bootMakeAClaim();
    givenClaim(ANSWERED_CLAIM);
    expect(
      (await page(claimPath('claimant-address'))).querySelector('#claimant-enterManuallyDetails')?.hasAttribute('open')
    ).toBe(true);
  });

  it('sends a stale remove link or an unchosen ground back to a page that can be shown', async () => {
    app = await bootMakeAClaim();
    givenClaim(ANSWERED_CLAIM);
    expect((await app.get(`${claimPath('remove-defendant')}?id=gone`)).location).toBe(claimPath('defendant-cya'));
    expect((await app.get(`${claimPath('ground-reason')}?ground=GROUND_1`)).location).toBe(claimPath('other-grounds'));
  });

  it('refuses a proof of arrears option the design does not offer', async () => {
    app = await bootMakeAClaim();
    givenClaim(ANSWERED_CLAIM);
    const refused = await app.post(claimPath('arrears-proof'), { proofType: 'TABLE' });
    expect(text(refused.text)).toContain('Select how you want to provide proof of rent arrears');
  });

  it('goes back and cancels to the transaction history from the ledger pages', async () => {
    app = await bootMakeAClaim();
    givenClaim({
      ...ANSWERED_CLAIM,
      rentArrears: {
        ...ANSWERED_CLAIM.rentArrears,
        proofType: 'LEDGER',
        rentHistoryLedger: [
          {
            id: 'b',
            value: { transactionDate: '2026-07-01', transactionTypes: ['RENT_CHARGE'], amountCharged: '100' },
          },
          {
            id: 'a',
            value: { transactionDate: '2026-06-01', transactionTypes: ['RENT_CHARGE'], amountCharged: '100' },
          },
        ],
      },
    });
    expect(backLink(await page(`${claimPath('ledger-transaction')}?entry=0`))).toBe(claimPath('ledger-summary'));
    const remove = await page(`${claimPath('remove-ledger-entry')}?id=a`);
    expect([...remove.querySelectorAll('a')].find(link => link.textContent === 'Cancel')?.getAttribute('href')).toBe(
      claimPath('ledger-summary')
    );
    const history = (await page(claimPath('ledger-summary'))).querySelectorAll('tbody tr');
    expect(history[0].textContent).toContain('1 June 2026');
    expect(history[0].textContent).toContain('transaction 1');
  });

  it('removes a payment from the rent statement after asking, once only', async () => {
    app = await bootMakeAClaim({ email: 'pl-table-0004@example.test' });
    givenClaim(TABLE_CLAIM);
    const statement = await page(claimPath('rent-statement'));
    const removeLinks = [...statement.querySelectorAll('a')].filter(link => link.textContent?.startsWith('Remove'));
    expect(removeLinks.map(link => link.getAttribute('href'))).toEqual([
      removePaymentPath(0, '2026-06-05', '5000'),
      removePaymentPath(1, '2026-06-15', '20000'),
    ]);
    expect(text((await app.get(removePaymentPath(0, '2026-06-05', '5000'))).text)).toContain(
      'Are you sure you want to remove the payment of £50.00 made on 5 June 2026?'
    );
    expect((await app.post(removePaymentPath(0, '2026-06-05', '5000'), { confirmRemove: 'yes' })).location).toBe(
      claimPath('rent-statement')
    );
    const rows = storedClaim().rentArrears.rentHistoryTable;
    expect(rows).toHaveLength(2);
    expect(storedClaim().confirmedSections).not.toContain('arrears-cya');
    expect(rows[0].value).toMatchObject({ dateDue: '2026-06-01', datePaid: '2026-06-15', amountPaid: '20000' });

    const repeated = await app.post(removePaymentPath(0, '2026-06-05', '5000'), { confirmRemove: 'yes' });
    expect(repeated.location).toBe(claimPath('rent-statement'));
    expect(storedClaim().rentArrears.rentHistoryTable).toHaveLength(2);
  });

  it('sends a payment page for a period not in the statement back to the statement with an error', async () => {
    app = await bootMakeAClaim({ email: 'pl-table-0005@example.test' });
    givenClaim(TABLE_CLAIM);
    const missing = await app.get(`${claimPath('rent-statement-payment')}?period=2024-01-01`);
    expect(missing.location).toBe(`${claimPath('rent-statement')}?problem=periodNotFound`);
    expect((await app.get(`${claimPath('rent-statement-payment')}?row=9`)).location).toBe(missing.location);
    const shown = await page(missing.location as string);
    expect(shown.title).toMatch(/^Error: Rent statement/);
    expect(shown.querySelector('.govuk-error-summary')?.textContent).toContain(
      'That rent period is not in the statement'
    );
  });

  it('refuses a payment made before its rent was due', async () => {
    app = await bootMakeAClaim({ email: 'pl-table-0006@example.test' });
    givenClaim(TABLE_CLAIM);
    const refused = await app.post(`${claimPath('rent-statement-payment')}?period=2026-07-01`, {
      'datePaid-day': '30',
      'datePaid-month': '6',
      'datePaid-year': '2026',
      amountPaid: '10',
    });
    expect(text(refused.text)).toContain(
      'The date the payment was made must be the same as or after 1 July 2026, the date this rent was due'
    );
    expect(text(refused.text)).toContain('towards the rent due on 1 July 2026 (£1,000.00).');
  });

  it('refuses a statement period that ends in the future or holds more than 260 rent periods', async () => {
    app = await bootMakeAClaim({ email: 'pl-table-0007@example.test' });
    givenClaim({ ...TABLE_CLAIM, rentArrears: { ...TABLE_CLAIM.rentArrears, rentFrequency: 'WEEKLY' } });
    const nextYear = String(Number(todayInLondon().slice(0, 4)) + 1);
    const future = await app.post(claimPath('statement-period'), {
      'statementStart-day': '1',
      'statementStart-month': '6',
      'statementStart-year': '2026',
      'statementEnd-day': '1',
      'statementEnd-month': '1',
      'statementEnd-year': nextYear,
    });
    expect(text(future.text)).toContain('The end date must be today or in the past');
    const tooLong = await app.post(claimPath('statement-period'), {
      'statementStart-day': '1',
      'statementStart-month': '1',
      'statementStart-year': '2020',
      'statementEnd-day': '31',
      'statementEnd-month': '12',
      'statementEnd-year': '2025',
    });
    expect(text(tooLong.text)).toContain(
      'The statement period is too long. Choose dates that cover no more than 260 rent periods'
    );
  });

  it('explains a declined card apart from other failed payments', async () => {
    app = await bootMakeAClaim();
    givenClaim({ submission: { serviceRequestReference: 'SR-1', feeAmount: '40400' } }, 'PENDING_CASE_ISSUED');
    ccd.cardPaymentStatus = 'Declined';
    await app.get(`/case/${CASE_REFERENCE}/pay-claim-fee/start`);
    const back = await app.get('/payment/return/RC-1111/confirmation');
    expect(back.location).toBe(`/case/${CASE_REFERENCE}/pay-claim-fee?payment=declined`);
    const declined = await page(back.location as string);
    expect(declined.body.textContent).toContain(
      'Your card was declined. You have not been charged. Try again or use a different card.'
    );
    expect(declined.title).toMatch(/^Error: /);
  });

  it('sends pcs-api eligibility refusals at submit to the page that explains them', async () => {
    app = await bootMakeAClaim();
    givenClaim(COMPLETE_CLAIM);
    ccd.refuseSubmit = ['CLAIM_AGAINST_TRESPASSERS_NOT_ELIGIBLE'];
    expect(
      (
        await app.post(claimPath('check-your-answers'), {
          statementOfTruth: ['contempt', 'belief'],
          statementOfTruthFullName: 'Billy Wright',
        })
      ).location
    ).toBe('/make-a-claim/trespass-ineligible');
  });

  it('refuses a change to how often or on which day rent is due that gives the statement more than 260 periods', async () => {
    app = await bootMakeAClaim({ email: 'pl-table-0008@example.test' });
    givenClaim(TABLE_CLAIM);
    await app.post(claimPath('statement-period'), {
      'statementStart-day': '10',
      'statementStart-month': '1',
      'statementStart-year': '2004',
      'statementEnd-day': '15',
      'statementEnd-month': '9',
      'statementEnd-year': '2025',
    });
    const laidOut = storedClaim().rentArrears.rentHistoryTable;
    expect(laidOut.filter((row: { value: { amountDue?: string } }) => row.value.amountDue)).toHaveLength(260);
    const tooMany = 'The rent statement would then cover more than 260 rent periods';
    expect(text((await app.post(claimPath('rent-frequency'), { rentFrequency: 'WEEKLY' })).text)).toContain(tooMany);
    expect(text((await app.post(claimPath('rent-due-day'), { rentDueDay: '12' })).text)).toContain(tooMany);
    expect(storedClaim().rentArrears).toMatchObject({ rentFrequency: 'MONTHLY', rentDueDay: 1 });
    expect(storedClaim().rentArrears.rentHistoryTable).toEqual(laidOut);
  });

  it('takes a payment made before the first rent was due on the first period', async () => {
    app = await bootMakeAClaim({ email: 'pl-table-0009@example.test' });
    givenClaim(TABLE_CLAIM);
    const saved = await app.post(`${claimPath('rent-statement-payment')}?row=0`, {
      'datePaid-day': '20',
      'datePaid-month': '5',
      'datePaid-year': '2026',
      amountPaid: '50',
    });
    expect(saved.location).toBe(claimPath('rent-statement'));
    expect(storedClaim().rentArrears.rentHistoryTable[0].value).toMatchObject({ datePaid: '2026-05-20' });
  });

  it('removes a payment that has no date', async () => {
    app = await bootMakeAClaim({ email: 'pl-table-0010@example.test' });
    givenClaim({
      ...TABLE_CLAIM,
      rentArrears: {
        ...TABLE_CLAIM.rentArrears,
        rentHistoryTable: [
          { value: { periodStart: '2026-06-01', dateDue: '2026-06-01', amountDue: '100000', amountPaid: '5000' } },
        ],
      },
    });
    const statement = await page(claimPath('rent-statement'));
    const remove = [...statement.querySelectorAll('a')].find(link => link.textContent?.startsWith('Remove'));
    expect(remove?.getAttribute('href')).toBe(removePaymentPath(0, '', '5000'));
    expect((await app.post(removePaymentPath(0, '', '5000'), { confirmRemove: 'yes' })).location).toBe(
      claimPath('rent-statement')
    );
    expect(storedClaim().rentArrears.rentHistoryTable[0].value.amountPaid).toBeUndefined();
  });

  it('sends a remove link for a ledger transaction that has gone back to the transactions', async () => {
    app = await bootMakeAClaim();
    givenClaim({ ...ANSWERED_CLAIM, rentArrears: { ...ANSWERED_CLAIM.rentArrears, proofType: 'LEDGER' } });
    expect((await app.get(`${claimPath('remove-ledger-entry')}?entry=3`)).location).toBe(claimPath('ledger-summary'));
    expect((await app.post(`${claimPath('remove-ledger-entry')}?entry=3`, { confirmRemove: 'yes' })).location).toBe(
      claimPath('ledger-summary')
    );
  });

  it('asks the reason for a ground added from a summary, not one already given', async () => {
    app = await bootMakeAClaim();
    givenClaim({
      ...ANSWERED_CLAIM,
      grounds: {
        hasRentArrearsGrounds: 'NO',
        otherGrounds: ['GROUND_1A'],
        groundReasons: [{ value: { ground: 'GROUND_1A', reason: 'Selling' } }],
      },
    });
    const changed = await app.post(`${claimPath('other-grounds')}?returnTo=tenancy-cya`, {
      mandatoryGrounds: 'GROUND_1A',
      discretionaryGrounds: 'GROUND_14',
    });
    expect(changed.location).toBe(`${claimPath('ground-reason')}?ground=GROUND_14&returnTo=tenancy-cya`);
  });

  it('shows no payment problem for a payment query it does not know', async () => {
    app = await bootMakeAClaim();
    givenClaim({ submission: { serviceRequestReference: 'SR-1', feeAmount: '40400' } }, 'PENDING_CASE_ISSUED');
    const shown = await page(`/case/${CASE_REFERENCE}/pay-claim-fee?payment=constructor`);
    expect(shown.title).not.toMatch(/^Error: /);
    expect(shown.querySelector('.govuk-error-summary')).toBeNull();
  });
});

describe('confirming each section on its check your answers page', () => {
  const taskList = async () => text((await app.get(claimPath('task-list'))).text);
  const unconfirmed = (...cyas: string[]) => ({
    ...COMPLETE_CLAIM,
    confirmedSections: ALL_SECTION_CYAS.filter(cya => !cyas.includes(cya)),
  });

  it('shows a section with every question answered as in progress until its summary is confirmed', async () => {
    app = await bootMakeAClaim();
    givenClaim({ ...COMPLETE_CLAIM, confirmedSections: [] });
    const page = await taskList();
    expect(page).toContain('About you and your contact preferences In progress');
    expect(page).toContain('About the defendants In progress');
    expect(page).toContain('About the tenancy, your grounds and notice served In progress');
    expect(page).toContain('Proof of rent arrears In progress');
    expect(page).toContain('Circumstances In progress');
    expect(page).toContain('Upload files and other information Done');
    expect(page).toContain('Check your answers and submit Not available yet');
  });

  it('shows the section as done once the claimant continues from its summary, confirming it once', async () => {
    app = await bootMakeAClaim();
    givenClaim(unconfirmed('claimant-cya'));
    expect((await app.post(claimPath('claimant-cya'), {})).location).toBe(claimPath('task-list'));
    expect(storedClaim().confirmedSections).toEqual(expect.arrayContaining(ALL_SECTION_CYAS));
    expect(await taskList()).toContain('About you and your contact preferences Done');
    expect(await taskList()).toContain('Check your answers and submit Available');

    const saves = ccd.draftSaves.length;
    await app.post(claimPath('claimant-cya'), {});
    expect(ccd.draftSaves).toHaveLength(saves);
    expect(storedClaim().confirmedSections.filter((cya: string) => cya === 'claimant-cya')).toHaveLength(1);
  });

  it('needs both the tenancy and the notice summaries confirmed for the tenancy, grounds and notice', async () => {
    app = await bootMakeAClaim();
    givenClaim(unconfirmed('tenancy-cya', 'notice-cya'));
    await app.post(claimPath('tenancy-cya'), {});
    expect(await taskList()).toContain('About the tenancy, your grounds and notice served In progress');
    await app.post(claimPath('notice-cya'), {});
    expect(await taskList()).toContain('About the tenancy, your grounds and notice served Done');
  });

  it('does not confirm a summary on Save for later', async () => {
    app = await bootMakeAClaim();
    givenClaim(unconfirmed('situation-cya'));
    await app.post(claimPath('situation-cya'), { action: 'saveForLater' });
    expect(storedClaim().confirmedSections).not.toContain('situation-cya');
    expect(await taskList()).toContain('Circumstances In progress');
  });

  it('asks for the summary again after an answer changes, returning to it from a Change link', async () => {
    app = await bootMakeAClaim();
    givenClaim(COMPLETE_CLAIM);
    const changed = await app.post(`${claimPath('claimant-name')}?returnTo=claimant-cya`, {
      firstName: 'Bill',
      lastName: 'Wright',
    });
    expect(changed.location).toBe(claimPath('claimant-cya'));
    expect(storedClaim().confirmedSections).not.toContain('claimant-cya');
    expect(await taskList()).toContain('About you and your contact preferences In progress');

    await app.post(claimPath('claimant-cya'), {});
    expect(await taskList()).toContain('About you and your contact preferences Done');
  });

  it('keeps the summary confirmed when a page is saved without a change', async () => {
    app = await bootMakeAClaim();
    givenClaim(COMPLETE_CLAIM);
    await app.post(claimPath('tenancy-type'), { tenancyType: 'ASSURED', action: 'saveForLater' });
    await app.post(claimPath('tenancy-type'), { tenancyType: 'ASSURED' });
    expect(storedClaim().confirmedSections).toEqual(ALL_SECTION_CYAS);
  });

  it('withdraws only the confirmation of the summary that shows the changed answer', async () => {
    app = await bootMakeAClaim();
    givenClaim(COMPLETE_CLAIM);
    await app.post(claimPath('tenancy-type'), { tenancyType: 'EXCLUDED', action: 'saveForLater' });
    expect(storedClaim().confirmedSections).not.toContain('tenancy-cya');
    expect(storedClaim().confirmedSections).toContain('notice-cya');
    expect(storedClaim().confirmedSections).toContain('claimant-cya');
  });

  it('ignores confirmations sent in the form', async () => {
    app = await bootMakeAClaim();
    givenClaim({ ...COMPLETE_CLAIM, confirmedSections: [] });
    await app.post(claimPath('claimant-name'), {
      firstName: 'Billy',
      lastName: 'Wright',
      confirmedSections: ALL_SECTION_CYAS,
    });
    expect(storedClaim().confirmedSections).toBeUndefined();
    await app.post(claimPath('claimant-cya'), { confirmedSections: ALL_SECTION_CYAS });
    expect(storedClaim().confirmedSections).toEqual(['claimant-cya']);
  });

  it('sends check your answers to an unconfirmed summary, which returns there once confirmed', async () => {
    app = await bootMakeAClaim();
    givenClaim(unconfirmed('notice-cya'));
    expect((await app.get(claimPath('check-your-answers'))).location).toBe(
      `${claimPath('notice-cya')}?returnTo=check-your-answers`
    );
    expect((await app.post(`${claimPath('notice-cya')}?returnTo=check-your-answers`, {})).location).toBe(
      claimPath('check-your-answers')
    );
    expect((await app.get(claimPath('check-your-answers'))).status).toBe(200);
  });

  it('sends a change made from check your answers through the section summary before returning', async () => {
    app = await bootMakeAClaim();
    givenClaim(COMPLETE_CLAIM);
    const changed = await app.post(`${claimPath('claimant-name')}?returnTo=check-your-answers`, {
      firstName: 'Bill',
      lastName: 'Wright',
    });
    expect(changed.location).toBe(claimPath('check-your-answers'));
    expect((await app.get(claimPath('check-your-answers'))).location).toBe(
      `${claimPath('claimant-cya')}?returnTo=check-your-answers`
    );
  });
});
