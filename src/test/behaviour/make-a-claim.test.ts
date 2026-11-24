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
    emailAddress: 'pl-0001@example.test',
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
  circumstances: { defendantCircumstances: '', claimantCircumstances: '' },
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
    recoverySteps: 'Sent two letters',
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

  it('turns away an agent on a page of their own', async () => {
    app = await bootMakeAClaim();
    await app.post('/make-a-claim/claimant-type', { claimantType: 'PRIVATE_LANDLORD' });
    await app.post('/make-a-claim/trespass', { isTrespass: 'no' });
    await app.post('/make-a-claim/property-address', PROPERTY);
    expect((await app.post('/make-a-claim/who-is-claiming', { whoIsClaiming: 'AGENT' })).location).toBe(
      '/make-a-claim/agent-ineligible'
    );
    expect(text((await app.get('/make-a-claim/agent-ineligible')).text)).toContain(
      'Agents cannot make claims on behalf of a landlord. The landlord must make the claim instead.'
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
      eligibility: {
        claimantType: 'PRIVATE_LANDLORD',
        isTrespass: 'NO',
        whoIsClaiming: 'MYSELF',
        legislativeCountry: 'England',
      },
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

  it('asks the Wales claimant type of a cross-border property in Wales before creating the claim', async () => {
    app = await bootMakeAClaim();
    await app.post('/make-a-claim/claimant-type', { claimantType: 'PRIVATE_LANDLORD' });
    await app.post('/make-a-claim/trespass', { isTrespass: 'no' });
    await app.post('/make-a-claim/property-address', PROPERTY);
    expect((await app.post('/make-a-claim/property-country', { legislativeCountry: 'Wales' })).location).toBe(
      '/make-a-claim/wales-claimant-type'
    );
    expect(ccd.createRequests).toEqual([]);
  });

  it.each(['PROPERTY_NOT_IN_ENGLAND_OR_WALES', 'POSTCODE_NOT_ASSIGNED_TO_COURT'])(
    'sends a property pcs-api refuses with %s to the property ineligible page',
    async refusal => {
      app = await bootMakeAClaim();
      ccd.refuseCreate = refusal;
      ccd.propertyEligibility = 503;
      await app.post('/make-a-claim/claimant-type', { claimantType: 'PRIVATE_LANDLORD' });
      await app.post('/make-a-claim/trespass', { isTrespass: 'no' });
      await app.post('/make-a-claim/property-address', { ...PROPERTY, 'property-postcode': 'AB10 1XG' });

      const refused = await app.post('/make-a-claim/who-is-claiming', { whoIsClaiming: 'MYSELF' });

      expect(refused.location).toBe('/make-a-claim/property-ineligible');
    }
  );

  it('explains that only a property in England or Wales can be claimed for', async () => {
    app = await bootMakeAClaim();
    const page = new JSDOM((await app.get('/make-a-claim/property-ineligible')).text).window.document;

    expect(page.title).toMatch(/^You cannot use this service –/);
    expect(page.querySelector('h1')?.textContent?.trim()).toBe('You cannot use this service');
    const paragraphs = [...page.querySelectorAll('main p.govuk-body')].map(p =>
      p.textContent?.replace(/\s+/g, ' ').trim()
    );
    expect(paragraphs.slice(0, 2)).toEqual([
      'You can only make a possession claim against a property in England or Wales using this service.',
      'If your property is in Scotland you can use your local sheriff court (opens in new tab). There’s a different process in Northern Ireland (opens in new tab).',
    ]);
    expect(
      [...page.querySelectorAll('main p.govuk-body a[target="_blank"]')].slice(0, 2).map(a => a.textContent)
    ).toEqual([
      'your local sheriff court (opens in new tab)',
      'a different process in Northern Ireland (opens in new tab)',
    ]);
    const exit = page.querySelector('main a.govuk-button');
    expect(exit?.textContent?.trim()).toBe('Close and return to the GOV.UK homepage');
    expect(exit?.getAttribute('href')).toBe('https://www.gov.uk');
  });

  it('no longer has a page for a property outside the pilot courts', async () => {
    app = await bootMakeAClaim();
    expect((await app.get('/make-a-claim/property-not-covered')).status).toBe(404);
  });

  describe('checking the property as soon as the claimant gives it', () => {
    const giveProperty = async (): Promise<string | undefined> => {
      await app.post('/make-a-claim/claimant-type', { claimantType: 'PRIVATE_LANDLORD' });
      await app.post('/make-a-claim/trespass', { isTrespass: 'no' });
      return (await app.post('/make-a-claim/property-address', PROPERTY)).location;
    };

    it.each([
      [{ status: 'ELIGIBLE', legislativeCountry: 'England' }, '/make-a-claim/who-is-claiming'],
      [{ status: 'ELIGIBLE', legislativeCountry: 'Wales' }, '/make-a-claim/wales-claimant-type'],
      [{ status: 'NOT_ENGLAND_OR_WALES' }, '/make-a-claim/property-ineligible'],
      [{ status: 'NO_COURT' }, '/make-a-claim/property-ineligible'],
      [{ status: 'LEGISLATIVE_COUNTRY_REQUIRED' }, '/make-a-claim/property-country'],
    ])('sends a property pcs-api finds %j to %s', async (eligibility, page) => {
      app = await bootMakeAClaim();
      ccd.propertyEligibility = eligibility;
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
      ccd.propertyEligibility = { status: 'LEGISLATIVE_COUNTRY_REQUIRED' };
      await giveProperty();
      ccd.propertyEligibility = { status: 'NO_COURT' };
      expect((await app.post('/make-a-claim/property-country', { legislativeCountry: 'England' })).location).toBe(
        '/make-a-claim/property-ineligible'
      );
      expect(ccd.eligibilityChecks[1]).toEqual({ postcode: 'LU1 1AB', legislativeCountry: 'England' });
      expect(ccd.createRequests).toEqual([]);
    });

    it('asks who is claiming after an eligible cross-border property in England, then creates the claim', async () => {
      app = await bootMakeAClaim();
      ccd.propertyEligibility = { status: 'LEGISLATIVE_COUNTRY_REQUIRED' };
      expect(await giveProperty()).toBe('/make-a-claim/property-country');
      expect((await app.get('/make-a-claim/property-country')).status).toBe(200);
      ccd.propertyEligibility = { status: 'ELIGIBLE', legislativeCountry: 'England' };
      expect((await app.post('/make-a-claim/property-country', { legislativeCountry: 'England' })).location).toBe(
        '/make-a-claim/who-is-claiming'
      );
      expect(ccd.createRequests).toEqual([]);
      expect((await app.post('/make-a-claim/who-is-claiming', { whoIsClaiming: 'MYSELF' })).location).toBe(
        claimPath('eligible')
      );
      expect(ccd.createRequests[0].data.citizenPossessionClaim.eligibility.legislativeCountry).toBe('England');
    });

    it('checks a cross-border property again in Wales, then asks the Wales claimant type', async () => {
      app = await bootMakeAClaim();
      ccd.propertyEligibility = { status: 'LEGISLATIVE_COUNTRY_REQUIRED' };
      await giveProperty();
      ccd.propertyEligibility = { status: 'ELIGIBLE', legislativeCountry: 'Wales' };
      expect((await app.post('/make-a-claim/property-country', { legislativeCountry: 'Wales' })).location).toBe(
        '/make-a-claim/wales-claimant-type'
      );
      expect(ccd.eligibilityChecks[1]).toEqual({ postcode: 'LU1 1AB', legislativeCountry: 'Wales' });
      expect(
        new JSDOM((await app.get('/make-a-claim/wales-claimant-type')).text).window.document
          .querySelector('.govuk-back-link')
          ?.getAttribute('href')
      ).toBe('/make-a-claim/property-country');

      await app.post('/make-a-claim/wales-claimant-type', { walesClaimantType: 'PRIVATE_LANDLORD' });
      expect((await app.post('/make-a-claim/who-is-claiming', { whoIsClaiming: 'MYSELF' })).location).toBe(
        claimPath('eligible')
      );
      expect(ccd.createRequests[0].data.citizenPossessionClaim.eligibility.legislativeCountry).toBe('Wales');
    });

    it('sends a Scottish property to the property ineligible page without creating the claim', async () => {
      app = await bootMakeAClaim();
      ccd.propertyEligibility = { status: 'NOT_ENGLAND_OR_WALES' };
      await app.post('/make-a-claim/claimant-type', { claimantType: 'PRIVATE_LANDLORD' });
      await app.post('/make-a-claim/trespass', { isTrespass: 'no' });
      const given = await app.post('/make-a-claim/property-address', {
        'property-addressLine1': '1 Union Street',
        'property-town': 'Aberdeen',
        'property-postcode': 'AB10 1XG',
      });
      expect(given.location).toBe('/make-a-claim/property-ineligible');
      expect(ccd.eligibilityChecks).toEqual([{ postcode: 'AB10 1XG' }]);
      expect(ccd.createRequests).toEqual([]);
    });

    it('takes a property in England whose court is not in the pilot', async () => {
      app = await bootMakeAClaim();
      ccd.propertyEligibility = { status: 'ELIGIBLE', legislativeCountry: 'England' };
      await app.post('/make-a-claim/claimant-type', { claimantType: 'PRIVATE_LANDLORD' });
      await app.post('/make-a-claim/trespass', { isTrespass: 'no' });
      const given = await app.post('/make-a-claim/property-address', {
        'property-addressLine1': '1 Oxford Road',
        'property-town': 'Manchester',
        'property-postcode': 'M13 9PL',
      });
      expect(given.location).toBe('/make-a-claim/who-is-claiming');
      expect((await app.post('/make-a-claim/who-is-claiming', { whoIsClaiming: 'MYSELF' })).location).toBe(
        claimPath('eligible')
      );
      expect(storedClaim().eligibility.legislativeCountry).toBe('England');
    });
  });

  describe('a property in Wales', () => {
    const giveWelshProperty = async (): Promise<string | undefined> => {
      ccd.propertyEligibility = { status: 'ELIGIBLE', legislativeCountry: 'Wales' };
      await app.post('/make-a-claim/claimant-type', { claimantType: 'PRIVATE_LANDLORD' });
      await app.post('/make-a-claim/trespass', { isTrespass: 'no' });
      return (
        await app.post('/make-a-claim/property-address', {
          'property-addressLine1': '1 Test Street',
          'property-town': 'Betws-y-Coed',
          'property-postcode': 'LL24 0BE',
        })
      ).location;
    };

    it('asks the Wales claimant type, with the Welsh landlord types', async () => {
      app = await bootMakeAClaim();
      expect(await giveWelshProperty()).toBe('/make-a-claim/wales-claimant-type');
      const page = new JSDOM((await app.get('/make-a-claim/wales-claimant-type')).text).window.document;

      expect(page.title).toMatch(/^What type of claimant are you\? –/);
      expect(page.querySelector('h1')?.textContent?.trim()).toBe('What type of claimant are you?');
      expect([...page.querySelectorAll('.govuk-radios__label')].map(label => label.textContent?.trim())).toEqual([
        'Private landlord',
        'Registered community landlord',
        'Mortgage provider',
      ]);
      expect(page.querySelector('input[name="walesClaimantType"]:checked')).toBeNull();
      expect(page.querySelector('.govuk-back-link')?.getAttribute('href')).toBe('/make-a-claim/property-address');
    });

    it('asks a private landlord who is claiming, then creates the claim for the property in Wales', async () => {
      app = await bootMakeAClaim();
      await giveWelshProperty();
      expect(
        (await app.post('/make-a-claim/wales-claimant-type', { walesClaimantType: 'PRIVATE_LANDLORD' })).location
      ).toBe('/make-a-claim/who-is-claiming');
      expect(
        new JSDOM((await app.get('/make-a-claim/who-is-claiming')).text).window.document
          .querySelector('.govuk-back-link')
          ?.getAttribute('href')
      ).toBe('/make-a-claim/wales-claimant-type');
      expect(
        new JSDOM((await app.get('/make-a-claim/wales-claimant-type')).text).window.document
          .querySelector('input[name="walesClaimantType"]:checked')
          ?.getAttribute('value')
      ).toBe('PRIVATE_LANDLORD');

      expect((await app.post('/make-a-claim/who-is-claiming', { whoIsClaiming: 'MYSELF' })).location).toBe(
        claimPath('eligible')
      );
      expect(ccd.createRequests[0].data.citizenPossessionClaim.eligibility).toEqual({
        claimantType: 'PRIVATE_LANDLORD',
        isTrespass: 'NO',
        whoIsClaiming: 'MYSELF',
      });
      expect(storedClaim().eligibility.legislativeCountry).toBe('Wales');
    });

    it.each(['COMMUNITY_LANDLORD', 'MORTGAGE_LENDER'])('turns away a %s with the Wales wording', async type => {
      app = await bootMakeAClaim();
      await giveWelshProperty();
      expect((await app.post('/make-a-claim/wales-claimant-type', { walesClaimantType: type })).location).toBe(
        '/make-a-claim/not-private-landlord'
      );
      const page = new JSDOM((await app.get('/make-a-claim/not-private-landlord')).text).window.document;
      expect(text(page.body.innerHTML)).toContain(
        'If you’re a registered community landlord or a mortgage provider, use MyHMCTS instead.'
      );
      expect(page.querySelector('.govuk-back-link')?.getAttribute('href')).toBe('/make-a-claim/wales-claimant-type');
      expect(ccd.createRequests).toEqual([]);
    });

    it('asks a claimant to choose a Wales claimant type', async () => {
      app = await bootMakeAClaim();
      await giveWelshProperty();
      const refused = await app.post('/make-a-claim/wales-claimant-type', {});
      const page = new JSDOM(refused.text).window.document;
      expect(page.title).toMatch(/^Error: /);
      expect(text(page.body.innerHTML)).toContain('Select what type of claimant you are');
    });

    it('is not asked about a property in England', async () => {
      app = await bootMakeAClaim();
      await app.post('/make-a-claim/claimant-type', { claimantType: 'PRIVATE_LANDLORD' });
      await app.post('/make-a-claim/trespass', { isTrespass: 'no' });
      expect((await app.post('/make-a-claim/property-address', PROPERTY)).location).toBe(
        '/make-a-claim/who-is-claiming'
      );
      expect((await app.get('/make-a-claim/wales-claimant-type')).location).toBe('/make-a-claim/property-address');
    });

    it('needs the claimant to be signed in', async () => {
      app = await bootMakeAClaim({ signedIn: false });
      expect((await app.get('/make-a-claim/wales-claimant-type')).location).toBe('/login');
    });
  });
});

describe('the task list', () => {
  it('groups the tasks as the design does, with the rent arrears task only for a rent arrears claim', async () => {
    app = await bootMakeAClaim();
    givenClaim({ eligibility: ANSWERED_CLAIM.eligibility, grounds: { hasRentArrearsGrounds: 'NO' } });
    const page = text((await app.get(claimPath('task-list'))).text);
    expect(page).not.toContain('Check you’re eligible');
    expect(page).not.toContain('Other information');
    expect(page).toMatch(
      /Your claim.*About you and your contact preferences Available.*About the defendants Available.*About the tenancy and your grounds for possession In progress.*About the notice you served Available.*Circumstances Available.*Provide evidence.*Upload documents Available.*Review and submit.*Check your answers and submit Not available yet/
    );
    expect(page).not.toContain('Proof of rent arrears');
  });

  it('opens checking your answers once every section is done', async () => {
    app = await bootMakeAClaim();
    givenClaim(ANSWERED_CLAIM);
    const page = text((await app.get(claimPath('task-list'))).text);
    expect(page).toContain('Proof of rent arrears In progress');
    expect(page).toContain('Upload documents Done');
    givenClaim({ ...COMPLETE_CLAIM, otherInformation: { otherDocuments: [] } });
    expect(text((await app.get(claimPath('task-list'))).text)).toContain('Check your answers and submit Available');
    givenClaim(COMPLETE_CLAIM);
    expect(text((await app.get(claimPath('task-list'))).text)).toContain('Check your answers and submit In progress');
  });

  it('keeps check your answers closed until the documents task is done', async () => {
    app = await bootMakeAClaim();
    givenClaim({
      ...COMPLETE_CLAIM,
      otherInformation: { ...COMPLETE_CLAIM.otherInformation, otherDocuments: undefined },
    });
    expect(text((await app.get(claimPath('task-list'))).text)).toContain(
      'Check your answers and submit Not available yet'
    );
    expect((await app.get(claimPath('check-your-answers'))).location).toBe(claimPath('upload-other-documents'));
  });

  it('starts the check your answers task with the final questions, and asks one left unanswered first', async () => {
    app = await bootMakeAClaim();
    givenClaim({ ...COMPLETE_CLAIM, otherInformation: { otherDocuments: [] } });
    const page = new JSDOM((await app.get(claimPath('task-list'))).text).window.document;
    const link = [...page.querySelectorAll('a')].find(a => a.textContent?.includes('Check your answers and submit'));
    expect(link?.getAttribute('href')).toBe(claimPath('other-information'));
    expect((await app.get(claimPath('check-your-answers'))).location).toBe(claimPath('other-reasons'));
  });

  it('returns to the task list from the documents task and from the tenancy summary', async () => {
    app = await bootMakeAClaim();
    givenClaim(COMPLETE_CLAIM);
    expect((await app.post(claimPath('upload-other-documents'), { action: 'continue' })).location).toBe(
      claimPath('task-list')
    );
    expect((await app.post(claimPath('tenancy-cya'), { action: 'continue' })).location).toBe(claimPath('task-list'));
  });
});

describe('every page renders', () => {
  it('with a rent statement created', async () => {
    app = await bootMakeAClaim();
    givenClaim({
      ...ANSWERED_CLAIM,
      rentArrears: {
        ...ANSWERED_CLAIM.rentArrears,
        proofType: 'TABLE',
        rentDueDay: 1,
        moneyJudgmentWanted: 'NO',
        recoverySteps: 'Sent two letters',
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
        `${claimPath(name)}?period=2026-06-01&row=0&datePaid=2026-06-02&amountPaid=50000&index=0`
      );
      if (redirected[name] ? response.location !== redirected[name] : response.status !== 200) {
        failures.push(`${name}: ${response.status} ${text(response.text).slice(0, 200)}`);
      }
    }
    expect(failures).toEqual([]);
  });
});

describe('the occupation contract for a property in Wales', () => {
  const WALES_ELIGIBILITY = { ...ANSWERED_CLAIM.eligibility, legislativeCountry: 'Wales' };
  const page = async (path: string) => new JSDOM((await app.get(path)).text).window.document;
  const radios = (document: Document) =>
    [...document.querySelectorAll('.govuk-radios__label')].map(label => label.textContent?.trim());

  it('asks about the occupation contract instead of the tenancy', async () => {
    app = await bootMakeAClaim();
    givenClaim({ eligibility: WALES_ELIGIBILITY });

    expect((await app.post(claimPath('tenancy-details'), {})).location).toMatch(
      new RegExp(`^${claimPath('occupation-contract-type')}`)
    );
    const contractType = await page(claimPath('occupation-contract-type'));
    expect(contractType.title).toMatch(/^What type of occupation contract or licence is in place, or was in place\? –/);
    expect(contractType.querySelector('h1')?.textContent?.trim()).toBe(
      'What type of occupation contract or licence is in place, or was in place?'
    );
    expect(radios(contractType)).toEqual(['Standard contract', 'Secure contract', 'Other']);
    expect(contractType.querySelector('input[name="occupationContractType"]:checked')).toBeNull();
    expect(
      contractType
        .querySelector('label[for="occupationContractType.otherOccupationContractDetails"]')
        ?.textContent?.trim()
    ).toBe('Give details of the type of occupation contract or licence');
  });

  it('asks a property in England about the tenancy', async () => {
    app = await bootMakeAClaim();
    givenClaim({ eligibility: { ...ANSWERED_CLAIM.eligibility, legislativeCountry: 'England' } });
    expect((await app.post(claimPath('tenancy-details'), {})).location).toMatch(
      new RegExp(`^${claimPath('tenancy-type')}`)
    );
  });

  it('saves the occupation contract, its start date and whether the agreement can be uploaded', async () => {
    app = await bootMakeAClaim();
    givenClaim({ eligibility: WALES_ELIGIBILITY });

    const missingDetails = await app.post(claimPath('occupation-contract-type'), { occupationContractType: 'OTHER' });
    expect(text(missingDetails.text)).toContain('Enter the type of occupation contract or licence');
    expect(
      (await app.post(claimPath('occupation-contract-type'), { occupationContractType: 'STANDARD_CONTRACT' })).location
    ).toMatch(new RegExp(`^${claimPath('occupation-contract-start-date')}`));
    expect(storedClaim().tenancy).toEqual({ occupationContractType: 'STANDARD_CONTRACT' });

    const startDate = await page(claimPath('occupation-contract-start-date'));
    expect(startDate.querySelector('h1')?.textContent?.trim()).toBe(
      'When did the occupation contract or licence begin?'
    );
    expect(text(startDate.body.innerHTML)).toContain('For example, 27 9 2022');
    expect(
      (
        await app.post(claimPath('occupation-contract-start-date'), {
          'occupationContractStartDate-day': '27',
          'occupationContractStartDate-month': '9',
          'occupationContractStartDate-year': '2022',
        })
      ).location
    ).toMatch(new RegExp(`^${claimPath('occupation-contract-agreement')}`));
    expect(storedClaim().tenancy.tenancyStartDate).toBe('2022-09-27');

    const agreement = await page(claimPath('occupation-contract-agreement'));
    expect(agreement.querySelector('h1')?.textContent?.trim()).toBe(
      'Can you upload a copy of the occupation contract or licence agreement?'
    );
    expect(text(agreement.body.innerHTML)).toContain('You’ll be able to upload it on the next screen');
    expect(text(agreement.body.innerHTML)).toContain(
      'Explain why you cannot upload a copy of the occupation contract or licence agreement'
    );
    expect(
      (await app.post(claimPath('occupation-contract-agreement'), { tenancyAgreementAvailable: 'yes' })).location
    ).toMatch(new RegExp(`^${claimPath('upload-occupation-contract')}`));

    const upload = await page(claimPath('upload-occupation-contract'));
    expect(upload.querySelector('h1')?.textContent?.trim()).toBe('Upload occupation contract or licence agreement');
    expect(text(upload.body.innerHTML)).toContain(
      'Upload a signed copy of the occupation contract or licence agreement.'
    );
    expect(text(upload.body.innerHTML)).toContain("For example, 'licence agreement - 15 Garden Drive'");

    expect(
      (
        await app.post(claimPath('occupation-contract-agreement'), {
          tenancyAgreementAvailable: 'no',
          'tenancyAgreementAvailable.noTenancyAgreementReason': 'Lost in a flood',
        })
      ).location
    ).toMatch(new RegExp(`^${claimPath('mandatory-documents')}`));
    expect(storedClaim().tenancy).toEqual({
      occupationContractType: 'STANDARD_CONTRACT',
      tenancyStartDate: '2022-09-27',
      tenancyAgreementAvailable: 'NO',
      noTenancyAgreementReason: 'Lost in a flood',
    });
  });

  it('shows the occupation contract answers, not the tenancy ones, on the summary', async () => {
    app = await bootMakeAClaim();
    givenClaim({
      ...ANSWERED_CLAIM,
      eligibility: WALES_ELIGIBILITY,
      tenancy: {
        occupationContractType: 'OTHER',
        otherOccupationContractDetails: 'Supported standard contract',
        tenancyStartDate: '2022-09-27',
        tenancyAgreementAvailable: 'NO',
        noTenancyAgreementReason: 'Lost in a flood',
      },
    });

    const summary = text((await app.get(claimPath('tenancy-cya'))).text);
    expect(summary).toMatch(
      /What type of occupation contract or licence is in place, or was in place\? Other\s*Supported standard contract/
    );
    expect(summary).toContain('When did the occupation contract or licence begin? 27 September 2022');
    expect(summary).toMatch(
      /Can you upload a copy of the occupation contract or licence agreement\? No\s*Lost in a flood/
    );
    expect(summary).not.toContain('What type of tenancy or licence is in place');
  });
});

describe('the mandatory documents and grounds for a property in Wales', () => {
  const WALES_CLAIM = {
    ...ANSWERED_CLAIM,
    eligibility: { ...ANSWERED_CLAIM.eligibility, legislativeCountry: 'Wales' },
  };
  const page = async (path: string) => new JSDOM((await app.get(path)).text).window.document;
  const heading = (document: Document) => document.querySelector('h1')?.textContent?.trim();
  const toStep = (name: string) => new RegExp(`^${claimPath(name)}`);

  it('explains the mandatory documents, then asks about each in turn', async () => {
    app = await bootMakeAClaim();
    givenClaim({ ...WALES_CLAIM, tenancy: { occupationContractType: 'STANDARD_CONTRACT' } });

    const interstitial = await page(claimPath('mandatory-documents'));
    expect(heading(interstitial)).toBe('Mandatory documents');
    const body = text(interstitial.body.innerHTML);
    expect(body).toContain('Under Welsh law, you must have provided a contract holder with certain documents.');
    expect(body).toContain('energy performance certificate');
    expect(body).toContain('current gas safety report');
    expect(body).toContain('current Electrical Installation Condition Report (EICR)');
    expect(body).toContain('If you cannot upload a copy of a document, you must explain why.');
    expect((await app.post(claimPath('mandatory-documents'), {})).location).toMatch(toStep('epc-available'));

    const epc = await page(claimPath('epc-available'));
    expect(heading(epc)).toBe('Can you upload a copy of the energy performance certificate?');
    expect(text(epc.body.innerHTML)).toContain(
      'Explain why you cannot upload a copy of the energy performance certificate.'
    );
    expect((await page(claimPath('gas-safety-available'))).querySelector('h1')?.textContent?.trim()).toBe(
      'Can you upload a copy of the current gas safety report?'
    );
    expect(heading(await page(claimPath('eicr-available')))).toBe(
      'Can you upload a copy of the Electrical Installation Condition Report (EICR)?'
    );
  });

  it('uploads each document that can be uploaded and explains why for each that cannot', async () => {
    app = await bootMakeAClaim();
    givenClaim({ ...WALES_CLAIM, tenancy: { occupationContractType: 'STANDARD_CONTRACT' } });

    expect((await app.post(claimPath('epc-available'), {})).status).toBe(400);
    expect((await app.post(claimPath('epc-available'), { hasEnergyPerformanceCertificate: 'yes' })).location).toMatch(
      toStep('upload-epc')
    );
    const upload = await page(claimPath('upload-epc'));
    expect(heading(upload)).toBe('Upload energy performance certificate');
    expect(text(upload.body.innerHTML)).toContain('Upload a copy of the energy performance certificate.');
    expect(text(upload.body.innerHTML)).toContain(
      "Give your document a name that explains what it is. For example, 'Receipt of payment from Jane Smith'"
    );

    const noReason = await app.post(claimPath('gas-safety-available'), { hasGasSafetyReport: 'no' });
    expect(text(noReason.text)).toContain('Explain why you cannot upload a copy of the current gas safety report');
    expect(
      (
        await app.post(claimPath('gas-safety-available'), {
          hasGasSafetyReport: 'no',
          'hasGasSafetyReport.noGasSafetyReportReason': 'No gas at the property',
        })
      ).location
    ).toMatch(toStep('eicr-available'));
    expect(
      (await app.post(claimPath('eicr-available'), { hasElectricalInstallationConditionReport: 'yes' })).location
    ).toMatch(toStep('upload-eicr'));
    expect(heading(await page(claimPath('upload-eicr')))).toBe(
      'Upload Electrical Installation Condition Report (EICR)'
    );
    expect(storedClaim().tenancy).toMatchObject({
      hasEnergyPerformanceCertificate: 'YES',
      hasGasSafetyReport: 'NO',
      noGasSafetyReportReason: 'No gas at the property',
      hasElectricalInstallationConditionReport: 'YES',
    });
    expect(storedClaim().tenancy.energyPerformanceDocuments).toBeUndefined();
  });

  it('shows the required documents on the tenancy summary', async () => {
    app = await bootMakeAClaim();
    givenClaim({
      ...WALES_CLAIM,
      tenancy: {
        occupationContractType: 'STANDARD_CONTRACT',
        tenancyStartDate: '2022-09-27',
        tenancyAgreementAvailable: 'NO',
        noTenancyAgreementReason: 'Lost',
        hasEnergyPerformanceCertificate: 'NO',
        noEnergyPerformanceCertificateReason: 'Not issued',
        hasGasSafetyReport: 'YES',
        gasSafetyReportDocuments: STATEMENT_DOCUMENTS.map(({ value }) => ({ value: value.document })),
      },
      grounds: { hasRentArrearsGrounds: 'NO', walesMandatoryGrounds: ['LANDLORD_BREAK_CLAUSE_S199'] },
    });

    const summary = text((await app.get(claimPath('tenancy-cya'))).text);
    expect(summary).toMatch(/Can you upload a copy of the energy performance certificate\? No\s*Not issued/);
    expect(summary).toContain('Can you upload a copy of the current gas safety report? Yes');
    expect(summary).toContain('Notice given under a landlord’s break clause (section 199)');
  });

  it('lists the Wales grounds, discretionary first, in place of the England ones', async () => {
    app = await bootMakeAClaim();
    givenClaim({ ...WALES_CLAIM, tenancy: { occupationContractType: 'STANDARD_CONTRACT' } });

    const grounds = await page(claimPath('wales-grounds'));
    expect(heading(grounds)).toBe('What are your grounds for possession?');
    const legends = [...grounds.querySelectorAll('legend')].map(legend => legend.textContent?.trim());
    expect(legends).toEqual(['Discretionary grounds', 'Mandatory grounds']);
    const labels = [...grounds.querySelectorAll('.govuk-checkboxes__label')].map(label => label.textContent?.trim());
    expect(labels).toEqual([
      'Rent arrears (breach of contract) (section 157)',
      'Antisocial behaviour (breach of contract) (section 157)',
      'Other breach of contract (section 157)',
      'Estate management grounds (section 160)',
      'Others',
      'Failure to give up possession on date specified in contract-holder’s notice (section 170)',
      'Landlord’s notice given in relation to periodic standard contract (section 178)',
      'Contract-holder under a periodic standard contract seriously in arrears with rent (section 181)',
      'Landlord’s notice in connection with end of fixed term given (section 186)',
      'Contract-holder under a fixed term standard contract seriously in arrears with rent (section 187)',
      'Failure to give up possession on date specified in contract-holder’s break clause notice (section 191)',
      'Notice given under a landlord’s break clause (section 199)',
      'Notice given in relation to end of converted fixed term standard contract (paragraph 25B(2) of Schedule 12)',
    ]);
    expect(text(grounds.body.innerHTML)).toContain(
      'On the notice you served, you should have already selected your possession grounds.'
    );
  });

  it('asks a property in Wales for its grounds on one page, not the England questions', async () => {
    app = await bootMakeAClaim();
    givenClaim({ ...WALES_CLAIM, tenancy: { occupationContractType: 'STANDARD_CONTRACT' } });

    expect(
      (await app.post(claimPath('eicr-available'), { hasElectricalInstallationConditionReport: 'yes' })).location
    ).toMatch(toStep('upload-eicr'));
    const empty = await app.post(claimPath('wales-grounds'), {});
    expect(text(empty.text)).toContain('Select at least one ground for possession');
    const missing = await app.post(claimPath('wales-grounds'), { walesDiscretionaryGrounds: ['OTHER'] });
    expect(text(missing.text)).toContain('Give details of your other grounds for possession');
  });

  it('leads a Wales rent arrears ground into the rent arrears task, and asks a reason for the others', async () => {
    app = await bootMakeAClaim();
    givenClaim({ ...WALES_CLAIM, tenancy: { occupationContractType: 'STANDARD_CONTRACT' } });

    const saved = await app.post(claimPath('wales-grounds'), {
      walesDiscretionaryGrounds: ['RENT_ARREARS_S157', 'ESTATE_MANAGEMENT_GROUNDS_S160'],
      walesMandatoryGrounds: ['SERIOUS_ARREARS_PERIODIC_S181', 'LANDLORD_BREAK_CLAUSE_S199'],
    });
    expect(saved.location).toBe(`${claimPath('ground-reason')}?nav=1`);
    expect(storedClaim().grounds).toMatchObject({
      hasRentArrearsGrounds: 'YES',
      walesDiscretionaryGrounds: ['RENT_ARREARS_S157', 'ESTATE_MANAGEMENT_GROUNDS_S160'],
      walesMandatoryGrounds: ['SERIOUS_ARREARS_PERIODIC_S181', 'LANDLORD_BREAK_CLAUSE_S199'],
    });

    const reason = await page(`${claimPath('ground-reason')}?ground=ESTATE_MANAGEMENT_GROUNDS_S160`);
    expect(heading(reason)).toBe(
      'Why are you making a claim for possession under Estate management grounds (section 160)?'
    );
    expect(
      (
        await app.post(`${claimPath('ground-reason')}?ground=ESTATE_MANAGEMENT_GROUNDS_S160`, {
          groundReason: 'Building works',
        })
      ).location
    ).toBe(`${claimPath('ground-reason')}?ground=LANDLORD_BREAK_CLAUSE_S199`);
    expect(
      (
        await app.post(`${claimPath('ground-reason')}?ground=LANDLORD_BREAK_CLAUSE_S199`, {
          groundReason: 'Break clause used',
        })
      ).location
    ).toMatch(toStep('tenancy-cya'));
    expect(storedClaim().grounds.walesGroundReasons).toEqual([
      expect.objectContaining({ value: { ground: 'ESTATE_MANAGEMENT_GROUNDS_S160', reason: 'Building works' } }),
      expect.objectContaining({ value: { ground: 'LANDLORD_BREAK_CLAUSE_S199', reason: 'Break clause used' } }),
    ]);
    expect(storedClaim().grounds.groundReasons).toBeUndefined();
  });

  it('shows the rent arrears task for a Wales rent arrears ground, and not for the other grounds', async () => {
    app = await bootMakeAClaim();
    const tasks = async () => text((await app.get(claimPath('task-list'))).text);
    givenClaim({
      ...WALES_CLAIM,
      grounds: { hasRentArrearsGrounds: 'YES', walesMandatoryGrounds: ['SERIOUS_ARREARS_FIXED_TERM_S187'] },
    });
    expect(await tasks()).toContain('Proof of rent arrears');
    givenClaim({
      ...WALES_CLAIM,
      grounds: { hasRentArrearsGrounds: 'NO', walesMandatoryGrounds: ['LANDLORD_BREAK_CLAUSE_S199'] },
    });
    expect(await tasks()).not.toContain('Proof of rent arrears');
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
    expect(storedClaim().claimant.emailAddress).toBe('pl-0001@example.test');

    expect((await app.post(claimPath('claimant-phone'), { contactByPhone: 'no' })).location).toBe(
      `${claimPath('claimant-text-message')}?nav=1`
    );
    expect((await app.post(claimPath('multiple-claimants'), { multipleClaimants: 'yes' })).location).toBe(
      `${claimPath('additional-claimant-type')}?index=0`
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

  it('offers the rent arrears grounds and Others in each group of the grounds page', async () => {
    app = await bootMakeAClaim();
    givenClaim({ ...ANSWERED_CLAIM, grounds: { hasRentArrearsGrounds: 'NO' } });
    const document = new JSDOM((await app.get(claimPath('other-grounds'))).text).window.document;
    const labelsIn = (group: string) =>
      [...document.querySelectorAll(`input[name="${group}"] + label`)].map(label => label.textContent?.trim());
    expect(labelsIn('mandatoryGrounds').slice(-2)).toEqual(['Rent arrears (Ground 8)', 'Others']);
    expect(labelsIn('discretionaryGrounds')).toEqual(
      expect.arrayContaining(['Any rent arrears (Ground 10)', 'Persistent arrears (Ground 11)', 'Others'])
    );
    expect(labelsIn('discretionaryGrounds').at(-1)).toBe('Others');
    expect(document.querySelectorAll('textarea[name$="otherGroundsDetails"]')).toHaveLength(2);
  });

  it('asks about a later defendant’s name without the hint', async () => {
    app = await bootMakeAClaim();
    givenClaim(ANSWERED_CLAIM);
    const first = text((await app.get(claimPath('defendant-name'))).text);
    expect(first).toContain('Do you know the defendant’s name?');
    expect(first).toContain('If you do not know their name');
    const next = text((await app.get(`${claimPath('defendant-name')}?index=1`)).text);
    expect(next).toContain('Do you know the next defendant’s name?');
    expect(next).not.toContain('If you do not know their name');
    expect(new JSDOM((await app.get(`${claimPath('defendant-name')}?index=1`)).text).window.document.title).toContain(
      'Do you know the next defendant’s name? –'
    );
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
    expect(text((await app.get(claimPath('defendant-cya'))).text)).toContain(
      'Do you know the next defendant’s name? No'
    );
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

describe('proof of rent arrears', () => {
  it('offers Upload a rent statement or Create a rent statement, and Upload asks for the statement', async () => {
    app = await bootMakeAClaim();
    givenClaim(ANSWERED_CLAIM);
    const proof = text((await app.get(claimPath('arrears-proof'))).text);
    expect(proof).toContain('Upload a rent statement that follows the guidelines');
    expect(proof).toContain('Create a rent statement');
    expect((await app.post(claimPath('arrears-proof'), { proofType: 'UPLOAD_STATEMENT' })).location).toBe(
      `${claimPath('upload-rent-statement')}?nav=1`
    );
    expect(storedClaim().rentArrears.proofType).toBe('UPLOAD_STATEMENT');
  });

  it('offers only Upload for rent paid at some other frequency', async () => {
    app = await bootMakeAClaim();
    givenClaim({ ...ANSWERED_CLAIM, rentArrears: { ...ANSWERED_CLAIM.rentArrears, rentFrequency: 'OTHER' } });
    const proof = text((await app.get(claimPath('arrears-proof'))).text);
    expect(proof).toContain('Upload a rent statement that follows the guidelines');
    expect(proof).not.toContain('Create a rent statement');
  });

  it('creates a statement from the due day and period, then takes payments period by period', async () => {
    app = await bootMakeAClaim();
    givenClaim(ANSWERED_CLAIM);
    expect((await app.post(claimPath('arrears-proof'), { proofType: 'TABLE' })).location).toBe(
      `${claimPath('rent-due-day')}?nav=1`
    );
    const dueDay = text((await app.get(claimPath('rent-due-day'))).text);
    expect(dueDay).toContain('Which date of the month is rent due?');
    expect(dueDay).toContain('For example, if rent is due on the 28th of each month, enter ‘28’');
    expect((await app.post(claimPath('rent-due-day'), { rentDueDay: '1' })).location).toBe(
      `${claimPath('statement-period')}?nav=1`
    );
    const periodPage = text((await app.get(claimPath('statement-period'))).text);
    expect(periodPage).toContain('What period of time do you want the rent statement to cover?');
    expect(periodPage).toContain('It must cover the time period of either:');
    expect(
      (
        await app.post(claimPath('statement-period'), {
          'statementStart-day': '1',
          'statementStart-month': '6',
          'statementStart-year': '2026',
          'statementEnd-day': '31',
          'statementEnd-month': '8',
          'statementEnd-year': '2026',
        })
      ).location
    ).toBe(`${claimPath('rent-statement')}?nav=1`);
    expect(
      storedClaim().rentArrears.rentHistoryTable.map((row: { value: { dateDue: string } }) => row.value.dateDue)
    ).toEqual(['2026-06-01', '2026-07-01', '2026-08-01']);

    const empty = new JSDOM((await app.get(claimPath('rent-statement'))).text).window.document;
    expect(text(empty.body.innerHTML)).toContain(
      'If a payment has been made for a period, you can add the details of this by selecting ‘Add a payment’ in the relevant row.'
    );
    expect([...empty.querySelectorAll('thead th')].map(cell => cell.textContent?.trim())).toEqual([
      'Period',
      'Date due',
      'Amount due',
      'Date paid',
      'Amount paid',
      'Total arrears',
      'Actions',
    ]);
    expect(
      [...empty.querySelectorAll('tbody tr')].map(row =>
        [...row.querySelectorAll('a')].map(a => a.getAttribute('href'))
      )
    ).toEqual([
      [`${claimPath('rent-statement-payment')}?period=2026-06-01`],
      [`${claimPath('rent-statement-payment')}?period=2026-07-01`],
      [`${claimPath('rent-statement-payment')}?period=2026-08-01`],
    ]);

    const addPath = `${claimPath('rent-statement-payment')}?period=2026-06-01`;
    const add = text((await app.get(addPath)).text);
    expect(add).toContain('Add a payment in this period (1 June 2026 to 30 June 2026)');
    expect(add).toContain('Do you want to add another payment in this period?');
    expect(add).not.toContain('Do you want to remove this payment');
    const another = await app.post(addPath, {
      'datePaid-day': '5',
      'datePaid-month': '6',
      'datePaid-year': '2026',
      amountPaid: '50',
      addAnotherPayment: 'yes',
    });
    expect(another.location).toBe(addPath);
    const fresh = new JSDOM((await app.get(addPath)).text).window.document;
    expect(fresh.querySelector<HTMLInputElement>('input[name="amountPaid"]')?.value ?? '').toBe('');
    const done = await app.post(addPath, {
      'datePaid-day': '15',
      'datePaid-month': '6',
      'datePaid-year': '2026',
      amountPaid: '200',
      addAnotherPayment: 'no',
    });
    expect(done.location).toBe(claimPath('rent-statement'));

    const statement = new JSDOM((await app.get(claimPath('rent-statement'))).text).window.document;
    const rows = [...statement.querySelectorAll('tbody tr')];
    expect(text(rows[0].innerHTML)).toContain('June 2026 1/6/2026 £1,000.00 5/6/2026 £50.00 £950.00');
    expect(text(rows[1].innerHTML)).toContain('15/6/2026 £200.00 £750.00');
    expect(text(rows[3].innerHTML)).toContain('August 2026 1/8/2026 £1,000.00 – – £2,750.00');
    expect(rows.map(row => [...row.querySelectorAll('a')].map(a => a.textContent?.split(' ')[0]))).toEqual([
      ['Change', 'Add'],
      ['Change'],
      ['Add'],
      ['Add'],
    ]);

    const change = text((await app.get(rows[1].querySelector('a')?.getAttribute('href') ?? '')).text);
    expect(change).toContain('Change a payment in this period (1 June 2026 to 30 June 2026)');
    expect(change).toContain('Do you want to remove this payment from the rent statement?');
    expect(change).not.toContain('Do you want to add another payment in this period?');
  });

  it('asks whether to add another payment, and keeps a payment inside its period', async () => {
    app = await bootMakeAClaim();
    givenClaim({
      ...ANSWERED_CLAIM,
      rentArrears: {
        ...ANSWERED_CLAIM.rentArrears,
        rentDueDay: 1,
        proofType: 'TABLE',
        rentHistoryTable: [
          { value: { periodStart: '2026-06-01', dateDue: '2026-06-01', amountDue: '100000' } },
          { value: { periodStart: '2026-07-01', dateDue: '2026-07-01', amountDue: '100000' } },
        ],
      },
    });
    const addPath = `${claimPath('rent-statement-payment')}?period=2026-06-01`;
    const unanswered = text(
      (
        await app.post(addPath, {
          'datePaid-day': '5',
          'datePaid-month': '6',
          'datePaid-year': '2026',
          amountPaid: '50',
        })
      ).text
    );
    expect(unanswered).toContain('Select whether you want to add another payment in this period');
    const late = text(
      (
        await app.post(addPath, {
          'datePaid-day': '2',
          'datePaid-month': '7',
          'datePaid-year': '2026',
          amountPaid: '50',
          addAnotherPayment: 'no',
        })
      ).text
    );
    expect(late).toContain('The date the payment was made must be the same as or before 30 June 2026');
    expect(storedClaim().rentArrears.rentHistoryTable[0].value.amountPaid).toBeUndefined();
  });
});

describe('submitting the claim', () => {
  it('submits the whole claim with the statement of truth, then takes the claim fee by card', async () => {
    app = await bootMakeAClaim();
    givenClaim(COMPLETE_CLAIM);
    const cya = text((await app.get(claimPath('check-your-answers'))).text);
    expect(cya).toContain('What is your name? Billy Wright');
    expect(cya).toContain('How much is the rent? £1,000.00');

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
    expect(confirmation).toContain('Your payment was successful');
    expect(confirmation).toContain('1777 0276 0001 7761');
    expect(confirmation).toContain('Payment summary Payment for Claim fee Total amount £404.00');
    expect(confirmation).toContain('What happens next');
    expect(confirmation).toContain('Close and return to case overview');
  });

  it('titles the claim submitted page by what the claimant has paid', async () => {
    app = await bootMakeAClaim();
    givenClaim(COMPLETE_CLAIM);
    await app.post(claimPath('check-your-answers'), {
      statementOfTruth: ['contempt', 'belief'],
      statementOfTruthFullName: 'Billy Wright',
      statementOfTruthPosition: '',
    });
    const titleOf = async (query: string) =>
      new JSDOM((await app.get(`/case/${CASE_REFERENCE}/claim-submitted${query}`)).text).window.document
        .querySelector('.govuk-panel__title')
        ?.textContent?.trim();
    expect(await titleOf('')).toBe('Claim submitted');
    expect(await titleOf('?status=success')).toBe('Your payment was successful');
    expect(await titleOf('?status=pending')).toBe('Your payment is being processed');
  });

  it('shows one check your answers card for each task list section, in order', async () => {
    app = await bootMakeAClaim();
    givenClaim(COMPLETE_CLAIM);
    const document = new JSDOM((await app.get(claimPath('check-your-answers'))).text).window.document;
    expect(
      [...document.querySelectorAll('.govuk-summary-card__title')].map(title => title.textContent?.trim())
    ).toEqual([
      'The property',
      'About you and your contact preferences',
      'About the defendants',
      'About the tenancy and your grounds for possession',
      'About the notice you served',
      'Proof of rent arrears',
      'Circumstances',
      'Upload documents',
      'Other information',
      'Language used',
      'Your support',
      'Equality and diversity questions',
    ]);
    expect(text(document.body.innerHTML)).toContain('Is there more than one adult in possession of the property? No');
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
    app = await bootMakeAClaim({ email: `pl-${'x'.repeat(250)}@example.test` });
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

  it('removes a rent statement payment after asking, withdrawing the rent arrears summary', async () => {
    app = await bootMakeAClaim();
    givenClaim({
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
        ],
      },
    });
    const changePath = `${claimPath('rent-statement-payment')}?row=0`;
    const keep = { 'datePaid-day': '5', 'datePaid-month': '6', 'datePaid-year': '2026', amountPaid: '50' };
    await app.post(changePath, { ...keep, removePayment: 'no' });
    expect(storedClaim().rentArrears.rentHistoryTable[0].value.amountPaid).toBe('5000');
    expect(storedClaim().confirmedSections).toContain('arrears-cya');
    expect((await app.post(changePath, { removePayment: 'yes' })).location).toBe(claimPath('rent-statement'));
    expect(storedClaim().rentArrears.rentHistoryTable[0].value.amountPaid).toBeUndefined();
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
      'Why are you making a claim for possession under Antisocial behaviour (Ground 14)? Noise'
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
      ['rent-statement-payment?period=2026-06-01', { ...parts('datePaid'), amountPaid: '10', addAnotherPayment: 'no' }],
    ];
    for (const [page, body] of pages) {
      expect([page, (await app.post(claimPath(page), body)).status]).toEqual([page, 303]);
    }
  });

  it('asks the general application question without promising guidance after submission', async () => {
    app = await bootMakeAClaim();
    givenClaim(ANSWERED_CLAIM);
    const page = new JSDOM((await app.get(claimPath('general-application'))).text).window.document;
    expect(page.querySelector('#generalApplicationIntent-hint')).toBeNull();
    expect(page.body.textContent).not.toContain('We’ll tell you how to make a general application');
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
      expect(page).toContain('Your payment was successful');
      expect(page).toContain('1777 0276 0001 7761');
      expect((await app.get(`/case/${CASE_REFERENCE}/pay-claim-fee`)).location).toBe(
        `/case/${CASE_REFERENCE}/claim-submitted`
      );
    });

    it('links the claim submitted page to the claimant dashboard, which links to the claim form', async () => {
      app = await bootMakeAClaim();
      givenClaim(FEE, 'CASE_ISSUED');
      const page = new JSDOM((await app.get(`/case/${CASE_REFERENCE}/claim-submitted?status=success`)).text).window
        .document;
      const link = [...page.querySelectorAll('a.govuk-link')].find(a => a.textContent === 'View your claim form');
      expect(link?.getAttribute('href')).toBe(`/case/${CASE_REFERENCE}/claimant-dashboard`);
      expect(text(page.body.innerHTML)).toContain('Your claim form will be ready a few minutes after your payment');
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
  const changePaymentPath = (row: number) => `${claimPath('rent-statement-payment')}?row=${row}`;
  const PAYMENT = { 'datePaid-day': '7', 'datePaid-month': '6', 'datePaid-year': '2026', amountPaid: '70' };

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
    await app.post(claimPath('defendant-circumstances'), { defendantCircumstances: '', action: 'saveForLater' });
    expect(storedClaim().circumstances.defendantCircumstances).toBeUndefined();
    await app.post(claimPath('defendant-circumstances'), { defendantCircumstances: '' });
    expect(storedClaim().circumstances.defendantCircumstances).toBe('');

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

  it('refuses a proof of arrears option it does not offer', async () => {
    app = await bootMakeAClaim();
    givenClaim({ ...ANSWERED_CLAIM, rentArrears: { ...ANSWERED_CLAIM.rentArrears, rentFrequency: 'OTHER' } });
    const refused = await app.post(claimPath('arrears-proof'), { proofType: 'TABLE' });
    expect(text(refused.text)).toContain('Select how you want to provide proof of rent arrears');
    expect(text((await app.post(claimPath('arrears-proof'), { proofType: 'LEDGER' })).text)).toContain(
      'Select how you want to provide proof of rent arrears'
    );
  });

  it('goes back to the rent statement from the add and change payment pages', async () => {
    app = await bootMakeAClaim();
    givenClaim(TABLE_CLAIM);
    expect(backLink(await page(`${claimPath('rent-statement-payment')}?period=2026-06-01`))).toBe(
      claimPath('rent-statement')
    );
    expect(backLink(await page(changePaymentPath(0)))).toBe(claimPath('rent-statement'));
  });

  it('removes a payment from its change page after asking, once only', async () => {
    app = await bootMakeAClaim({ email: 'pl-0004@example.test' });
    givenClaim(TABLE_CLAIM);
    const statement = await page(claimPath('rent-statement'));
    expect([...statement.querySelectorAll('a')].filter(link => link.textContent?.startsWith('Remove'))).toEqual([]);
    const change = await page(changePaymentPath(0));
    expect(change.querySelector('h1')?.textContent).toContain('Change a payment');
    expect(text(change.body.innerHTML)).toContain('Do you want to remove this payment from the rent statement? Yes No');
    const shown = change.querySelector<HTMLInputElement>('input[name="draftVersion"]')?.value ?? '';

    const unanswered = await app.post(changePaymentPath(0), { ...PAYMENT, draftVersion: shown });
    expect(unanswered.status).toBe(400);
    expect(text(unanswered.text)).toContain('Select whether you want to remove this payment from the rent statement');

    const removed = await app.post(changePaymentPath(0), { removePayment: 'yes', draftVersion: shown });
    expect(removed.location).toBe(claimPath('rent-statement'));
    const rows = storedClaim().rentArrears.rentHistoryTable;
    expect(rows).toHaveLength(2);
    expect(storedClaim().confirmedSections).not.toContain('arrears-cya');
    expect(rows[0].value).toMatchObject({ dateDue: '2026-06-01', datePaid: '2026-06-15', amountPaid: '20000' });

    const repeated = await app.post(changePaymentPath(0), { removePayment: 'yes', draftVersion: shown });
    expect(repeated.location).toContain(claimPath('check-your-answers'));
    expect(storedClaim().rentArrears.rentHistoryTable).toEqual(rows);
  });

  it('changes a payment when the claimant does not remove it, and asks nothing about removing when adding one', async () => {
    app = await bootMakeAClaim({ email: 'pl-0006@example.test' });
    givenClaim(TABLE_CLAIM);
    expect((await app.post(changePaymentPath(0), { ...PAYMENT, removePayment: 'no' })).location).toBe(
      claimPath('rent-statement')
    );
    expect(storedClaim().rentArrears.rentHistoryTable[0].value).toMatchObject({
      datePaid: '2026-06-07',
      amountPaid: '7000',
    });
    const add = await page(`${claimPath('rent-statement-payment')}?period=2026-07-01`);
    expect(add.querySelector('h1')?.textContent).toContain('Add a payment');
    expect(add.querySelector('input[name="removePayment"]')).toBeNull();
  });

  it('sends a payment page for a period not in the statement back to the statement with an error', async () => {
    app = await bootMakeAClaim({ email: 'pl-0005@example.test' });
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
    app = await bootMakeAClaim({ email: 'pl-0006@example.test' });
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
    expect(text(refused.text)).toContain('Add a payment in this period (1 July 2026 to 31 July 2026)');
  });

  it('refuses a statement period that ends in the future or holds more than 260 rent periods', async () => {
    app = await bootMakeAClaim({ email: 'pl-0007@example.test' });
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
    app = await bootMakeAClaim({ email: 'pl-0008@example.test' });
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
    app = await bootMakeAClaim({ email: 'pl-0009@example.test' });
    givenClaim(TABLE_CLAIM);
    const saved = await app.post(`${claimPath('rent-statement-payment')}?row=0`, {
      'datePaid-day': '20',
      'datePaid-month': '5',
      'datePaid-year': '2026',
      amountPaid: '50',
      removePayment: 'no',
    });
    expect(saved.location).toBe(claimPath('rent-statement'));
    expect(storedClaim().rentArrears.rentHistoryTable[0].value).toMatchObject({ datePaid: '2026-05-20' });
  });

  it('removes a payment that has no date', async () => {
    app = await bootMakeAClaim({ email: 'pl-0010@example.test' });
    givenClaim({
      ...TABLE_CLAIM,
      rentArrears: {
        ...TABLE_CLAIM.rentArrears,
        rentHistoryTable: [
          { value: { periodStart: '2026-06-01', dateDue: '2026-06-01', amountDue: '100000', amountPaid: '5000' } },
        ],
      },
    });
    expect((await app.post(changePaymentPath(0), { removePayment: 'yes' })).location).toBe(claimPath('rent-statement'));
    expect(storedClaim().rentArrears.rentHistoryTable[0].value.amountPaid).toBeUndefined();
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
    expect(page).toContain('About the tenancy and your grounds for possession In progress');
    expect(page).toContain('About the notice you served In progress');
    expect(page).toContain('Proof of rent arrears In progress');
    expect(page).toContain('Circumstances In progress');
    expect(page).toContain('Upload documents Done');
    expect(page).toContain('Check your answers and submit Not available yet');
  });

  it('shows the section as done once the claimant continues from its summary, confirming it once', async () => {
    app = await bootMakeAClaim();
    givenClaim(unconfirmed('claimant-cya'));
    expect((await app.post(claimPath('claimant-cya'), {})).location).toBe(claimPath('task-list'));
    expect(storedClaim().confirmedSections).toEqual(expect.arrayContaining(ALL_SECTION_CYAS));
    expect(await taskList()).toContain('About you and your contact preferences Done');
    expect(await taskList()).toContain('Check your answers and submit In progress');

    const saves = ccd.draftSaves.length;
    await app.post(claimPath('claimant-cya'), {});
    expect(ccd.draftSaves).toHaveLength(saves);
    expect(storedClaim().confirmedSections.filter((cya: string) => cya === 'claimant-cya')).toHaveLength(1);
  });

  it('confirms the tenancy and the notice as separate tasks, each on its own summary', async () => {
    app = await bootMakeAClaim();
    givenClaim(unconfirmed('tenancy-cya', 'notice-cya'));
    await app.post(claimPath('tenancy-cya'), {});
    expect(await taskList()).toContain('About the tenancy and your grounds for possession Done');
    expect(await taskList()).toContain('About the notice you served In progress');
    await app.post(claimPath('notice-cya'), {});
    expect(await taskList()).toContain('About the notice you served Done');
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
