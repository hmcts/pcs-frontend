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

const ELIGIBILITY = { isTrespass: 'NO', whoIsClaiming: 'MYSELF', legislativeCountry: 'England' };

const CLAIMANT = {
  individualOrOrganisation: 'INDIVIDUAL',
  firstName: 'Billy',
  lastName: 'Wright',
  address: { AddressLine1: '12 High Street', PostTown: 'London', PostCode: 'NW1 1AA' },
  emailAddress: 'pl-0001@example.test',
  contactByPhone: 'NO',
  contactByText: 'NO',
};

const ANSWERED_CLAIMANT = {
  value: {
    individualOrOrganisation: 'INDIVIDUAL',
    firstName: 'Jo',
    lastName: 'Smith',
    address: { AddressLine1: '1 Low Road', PostTown: 'Leeds', PostCode: 'LS1 1AA' },
    emailAddress: 'jo@example.test',
    contactByPhone: 'NO',
    contactByText: 'NO',
  },
};

const SUPPORT_FLAGS = {
  partyName: 'Billy Wright',
  roleOnCase: 'Claimant',
  details: [
    {
      id: 'flag-1',
      value: {
        name: 'Step free / wheelchair access',
        name_cy: 'Step free / wheelchair access',
        status: 'Requested',
        flagCode: 'RA0019',
        path: [{ id: 'p1', value: 'Party' }],
      },
    },
  ],
};

function text(html: string): string {
  return new JSDOM(html).window.document.body.textContent?.replace(/\s+/g, ' ') ?? '';
}

function buttons(html: string): string[] {
  return [...new JSDOM(html).window.document.querySelectorAll('main button')].map(
    button => button.textContent?.trim() ?? ''
  );
}

let app: TestApp;
afterEach(() => app?.close());

describe('additional claimants', () => {
  it('asks about the next claimant when the claimant says yes', async () => {
    app = await bootMakeAClaim();
    givenClaim({ eligibility: ELIGIBILITY, claimant: CLAIMANT });
    const answered = await app.post(claimPath('multiple-claimants'), { multipleClaimants: 'yes' });
    expect(answered.location).toBe(`${claimPath('additional-claimant-type')}?index=0`);
    expect(storedClaim().claimant.multipleClaimants).toBe('YES');
  });

  it('asks for an individual, then their name, address, email, telephone and text message', async () => {
    app = await bootMakeAClaim();
    givenClaim({ eligibility: ELIGIBILITY, claimant: { ...CLAIMANT, multipleClaimants: 'YES' } });
    const steps = claimPath;
    const index = '?index=0';

    const type = await app.get(`${steps('additional-claimant-type')}${index}`);
    expect(text(type.text)).toContain('Is the next claimant an individual or a registered company?');
    expect(text(type.text)).toContain('If they are registered on Companies House as a landlord, they are a company.');
    expect(text(type.text)).toContain('A registered company');

    expect(
      (await app.post(`${steps('additional-claimant-type')}${index}`, { individualOrOrganisation: 'INDIVIDUAL' }))
        .location
    ).toBe(`${steps('additional-claimant-name')}${index}`);
    expect(
      (await app.post(`${steps('additional-claimant-name')}${index}`, { firstName: 'Jo', lastName: 'Smith' })).location
    ).toBe(`${steps('additional-claimant-address')}${index}`);
    expect(
      (
        await app.post(`${steps('additional-claimant-address')}${index}`, {
          'additionalClaimant-addressLine1': '1 Low Road',
          'additionalClaimant-town': 'Leeds',
          'additionalClaimant-postcode': 'ls1 1aa',
        })
      ).location
    ).toBe(`${steps('additional-claimant-email')}${index}`);
    expect(
      (await app.post(`${steps('additional-claimant-email')}${index}`, { emailAddress: 'jo@example.test' })).location
    ).toBe(`${steps('additional-claimant-phone')}${index}`);
    expect(
      (
        await app.post(`${steps('additional-claimant-phone')}${index}`, {
          contactByPhone: 'yes',
          'contactByPhone.phoneNumber': '07700 900 982',
        })
      ).location
    ).toBe(`${steps('additional-claimant-text-message')}${index}`);
    expect(
      (
        await app.post(`${steps('additional-claimant-text-message')}${index}`, {
          contactByText: 'yes',
          'contactByText.textMessageNumber': '07700 900 111',
        })
      ).location
    ).toBe(steps('multiple-claimants'));

    expect(storedClaim().additionalClaimants).toHaveLength(1);
    expect(storedClaim().additionalClaimants[0].id).toBeDefined();
    expect(storedClaim().additionalClaimants[0].value).toEqual({
      individualOrOrganisation: 'INDIVIDUAL',
      firstName: 'Jo',
      lastName: 'Smith',
      address: { AddressLine1: '1 Low Road', PostTown: 'Leeds', PostCode: 'LS1 1AA' },
      emailAddress: 'jo@example.test',
      contactByPhone: 'YES',
      phoneNumber: '07700 900 982',
      contactByText: 'YES',
      textMessageNumber: '07700 900 111',
    });
  });

  it('asks a company for its name and drops the name of an individual it replaces', async () => {
    app = await bootMakeAClaim();
    givenClaim({
      eligibility: ELIGIBILITY,
      claimant: { ...CLAIMANT, multipleClaimants: 'YES' },
      additionalClaimants: [{ id: 'one', ...ANSWERED_CLAIMANT }],
    });
    const changed = await app.post(`${claimPath('additional-claimant-type')}?index=0`, {
      individualOrOrganisation: 'ORGANISATION',
    });
    expect(changed.location).toBe(`${claimPath('additional-claimant-organisation-name')}?index=0`);
    await app.post(`${claimPath('additional-claimant-organisation-name')}?index=0`, {
      organisationName: 'Acme Lettings Ltd',
    });
    expect(storedClaim().additionalClaimants[0].value).toMatchObject({
      individualOrOrganisation: 'ORGANISATION',
      organisationName: 'Acme Lettings Ltd',
    });
    expect(storedClaim().additionalClaimants[0].value.firstName).toBeUndefined();
  });

  it('returns a change from check your answers to it once the claimant is fully answered', async () => {
    app = await bootMakeAClaim();
    givenClaim({
      eligibility: ELIGIBILITY,
      claimant: { ...CLAIMANT, multipleClaimants: 'YES' },
      additionalClaimants: [{ id: 'one', ...ANSWERED_CLAIMANT }],
    });
    const changed = await app.post(`${claimPath('additional-claimant-name')}?index=0&returnTo=claimant-cya`, {
      firstName: 'Joanne',
      lastName: 'Smith',
    });
    expect(changed.location).toBe(claimPath('claimant-cya'));
  });

  it('asks for a new claimant once the earlier ones are answered, and finishes an unanswered one first', async () => {
    app = await bootMakeAClaim();
    givenClaim({
      eligibility: ELIGIBILITY,
      claimant: { ...CLAIMANT, multipleClaimants: 'YES' },
      additionalClaimants: [{ id: 'one', ...ANSWERED_CLAIMANT }],
    });
    expect((await app.post(claimPath('multiple-claimants'), { multipleClaimants: 'yes' })).location).toBe(
      `${claimPath('additional-claimant-type')}?index=1`
    );

    givenClaim({
      eligibility: ELIGIBILITY,
      claimant: { ...CLAIMANT, multipleClaimants: 'YES' },
      additionalClaimants: [{ id: 'one', value: { individualOrOrganisation: 'INDIVIDUAL' } }],
    });
    expect((await app.post(claimPath('multiple-claimants'), { multipleClaimants: 'yes' })).location).toBe(
      `${claimPath('additional-claimant-type')}?index=0`
    );
  });

  it('keeps the claimants added when the claimant says there are no more', async () => {
    app = await bootMakeAClaim();
    givenClaim({
      eligibility: ELIGIBILITY,
      claimant: { ...CLAIMANT, multipleClaimants: 'YES' },
      additionalClaimants: [
        { id: 'one', ...ANSWERED_CLAIMANT },
        { id: 'two', value: { individualOrOrganisation: 'ORGANISATION' } },
      ],
    });
    const answered = await app.post(claimPath('multiple-claimants'), { multipleClaimants: 'no' });
    expect(answered.location).toBe(`${claimPath('claimant-cya')}?nav=1`);
    expect(storedClaim().claimant.multipleClaimants).toBe('YES');
    expect(storedClaim().additionalClaimants.map((claimant: { id: string }) => claimant.id)).toEqual(['one']);
  });

  it('drops the additional claimants when no one else is claiming', async () => {
    app = await bootMakeAClaim();
    givenClaim({
      eligibility: ELIGIBILITY,
      claimant: { ...CLAIMANT, multipleClaimants: 'YES' },
      additionalClaimants: [{ id: 'one', value: { individualOrOrganisation: 'INDIVIDUAL' } }],
    });
    await app.post(claimPath('multiple-claimants'), { multipleClaimants: 'no' });
    expect(storedClaim().claimant.multipleClaimants).toBe('NO');
    expect(storedClaim().additionalClaimants).toBeUndefined();
  });

  it('says what to answer when a page is left empty', async () => {
    app = await bootMakeAClaim();
    givenClaim({ eligibility: ELIGIBILITY, claimant: { ...CLAIMANT, multipleClaimants: 'YES' } });
    expect(text((await app.post(`${claimPath('additional-claimant-type')}?index=0`, {})).text)).toContain(
      'Select whether the next claimant is an individual or a registered company'
    );
    expect(text((await app.post(`${claimPath('additional-claimant-name')}?index=0`, {})).text)).toContain(
      'Enter their first name'
    );
    expect(text((await app.post(`${claimPath('additional-claimant-phone')}?index=0`, {})).text)).toContain(
      'Select whether they want to be contacted by telephone'
    );
    expect(
      text((await app.post(`${claimPath('additional-claimant-email')}?index=0`, { emailAddress: 'x' })).text)
    ).toContain('Enter an email address in the correct format, like name@example.com');
    expect(storedClaim().additionalClaimants).toBeUndefined();
  });

  it('shows a card for each additional claimant on the about you summary', async () => {
    app = await bootMakeAClaim();
    givenClaim({
      eligibility: ELIGIBILITY,
      claimant: { ...CLAIMANT, multipleClaimants: 'YES' },
      additionalClaimants: [{ id: 'one', ...ANSWERED_CLAIMANT }],
    });
    const summary = text((await app.get(claimPath('claimant-cya'))).text);
    expect(summary).toContain('Additional claimant 1');
    expect(summary).toContain('What is their name? Jo Smith');
    expect(summary).toContain('What is their postal address?');
    expect(summary).toContain('Do they want to be contacted by telephone? No');
    expect(summary).not.toContain('You cannot use this service yet');
  });

  it('has no exit page for other claimants', async () => {
    app = await bootMakeAClaim();
    givenClaim({ eligibility: ELIGIBILITY, claimant: CLAIMANT });
    expect((await app.get(claimPath('multiple-claimants-ineligible'))).status).toBe(404);
  });
});

describe('grounds for possession on an excluded tenancy', () => {
  const EXCLUDED = {
    eligibility: ELIGIBILITY,
    tenancy: { tenancyType: 'EXCLUDED', tenancyStartDate: '2018-01-15', tenancyAgreementAvailable: 'NO' },
  };

  it('asks about grounds after the agreement pages instead of whether rent is owed', async () => {
    app = await bootMakeAClaim();
    givenClaim({ ...EXCLUDED, tenancy: { tenancyType: 'EXCLUDED', tenancyStartDate: '2018-01-15' } });
    const answered = await app.post(claimPath('tenancy-agreement'), {
      tenancyAgreementAvailable: 'no',
      'tenancyAgreementAvailable.noTenancyAgreementReason': 'Lost in a flood',
    });
    expect(answered.location).toMatch(new RegExp(`^${claimPath('excluded-grounds-claim')}`));
  });

  it('still asks an assured tenancy whether rent is owed', async () => {
    app = await bootMakeAClaim();
    givenClaim({ ...EXCLUDED, tenancy: { tenancyType: 'ASSURED', tenancyStartDate: '2018-01-15' } });
    const answered = await app.post(claimPath('tenancy-agreement'), {
      tenancyAgreementAvailable: 'no',
      'tenancyAgreementAvailable.noTenancyAgreementReason': 'Lost in a flood',
    });
    expect(answered.location).toMatch(new RegExp(`^${claimPath('rent-arrears-claim')}`));
  });

  it('shows the grounds question under its explanation', async () => {
    app = await bootMakeAClaim();
    givenClaim(EXCLUDED);
    const page = text((await app.get(claimPath('excluded-grounds-claim'))).text);
    expect(page).toContain('Grounds for possession');
    expect(page).toContain('In some cases, you can make a possession claim without relying on a specific ground.');
    expect(page).toContain('More information about possession grounds (opens in new tab)');
    expect(page).toContain('Do you have grounds for possession?');
  });

  it('sends yes to the ground list and no to the reason', async () => {
    app = await bootMakeAClaim();
    givenClaim(EXCLUDED);
    expect(text((await app.post(claimPath('excluded-grounds-claim'), {})).text)).toContain(
      'Select whether you have grounds for possession'
    );
    expect((await app.post(claimPath('excluded-grounds-claim'), { hasExcludedGrounds: 'yes' })).location).toBe(
      `${claimPath('excluded-grounds')}?nav=1`
    );
    expect((await app.post(claimPath('excluded-grounds-claim'), { hasExcludedGrounds: 'no' })).location).toBe(
      `${claimPath('excluded-reason')}?nav=1`
    );
  });

  it('lists the five grounds and needs details for Other', async () => {
    app = await bootMakeAClaim();
    givenClaim({ ...EXCLUDED, grounds: { hasExcludedGrounds: 'YES' } });
    const page = text((await app.get(claimPath('excluded-grounds'))).text);
    for (const ground of [
      'Rent arrears',
      'Antisocial behaviour',
      'Breach of the tenancy',
      'Absolute grounds',
      'Other',
    ]) {
      expect(page).toContain(ground);
    }
    expect(page).toContain('Select all that apply');

    expect(text((await app.post(claimPath('excluded-grounds'), {})).text)).toContain(
      'Select at least one ground for possession'
    );
    expect(text((await app.post(claimPath('excluded-grounds'), { excludedGrounds: ['OTHER'] })).text)).toContain(
      'Enter your grounds for possession'
    );

    const saved = await app.post(claimPath('excluded-grounds'), {
      excludedGrounds: ['ABSOLUTE_GROUNDS', 'OTHER'],
      'excludedGrounds.excludedOtherGroundDetails': 'Unlicensed occupier',
    });
    expect(saved.location).toBe(`${claimPath('excluded-reason')}?nav=1`);
    expect(storedClaim().grounds).toMatchObject({
      hasExcludedGrounds: 'YES',
      excludedGrounds: ['ABSOLUTE_GROUNDS', 'OTHER'],
      excludedOtherGroundDetails: 'Unlicensed occupier',
    });
  });

  it('deletes the grounds chosen when the answer changes to no, and the details when Other is unticked', async () => {
    app = await bootMakeAClaim();
    givenClaim({
      ...EXCLUDED,
      grounds: {
        hasExcludedGrounds: 'YES',
        excludedGrounds: ['ABSOLUTE_GROUNDS', 'OTHER'],
        excludedOtherGroundDetails: 'Unlicensed occupier',
      },
    });
    await app.post(claimPath('excluded-grounds'), { excludedGrounds: ['ABSOLUTE_GROUNDS'] });
    expect(storedClaim().grounds.excludedOtherGroundDetails).toBeUndefined();

    await app.post(claimPath('excluded-grounds-claim'), { hasExcludedGrounds: 'no' });
    expect(storedClaim().grounds).toEqual({ hasExcludedGrounds: 'NO' });
  });

  it('asks why the claim is made and goes on to the tenancy summary', async () => {
    app = await bootMakeAClaim();
    givenClaim({ ...EXCLUDED, grounds: { hasExcludedGrounds: 'NO' } });
    expect(text((await app.get(claimPath('excluded-reason'))).text)).toContain(
      'Why are you making a possession claim?'
    );
    expect(text((await app.post(claimPath('excluded-reason'), {})).text)).toContain(
      'Explain why you are making a possession claim'
    );
    const saved = await app.post(claimPath('excluded-reason'), { excludedReason: 'The occupier is a lodger' });
    expect(saved.location).toBe(`${claimPath('tenancy-cya')}?nav=1`);
    expect(storedClaim().grounds.excludedReason).toBe('The occupier is a lodger');
  });

  it('shows the grounds answers on the tenancy summary, and not the assured grounds rows', async () => {
    app = await bootMakeAClaim();
    givenClaim({
      ...EXCLUDED,
      grounds: {
        hasExcludedGrounds: 'YES',
        excludedGrounds: ['ANTI_SOCIAL', 'OTHER'],
        excludedOtherGroundDetails: 'Unlicensed occupier',
        excludedReason: 'The occupier is a lodger',
      },
    });
    const summary = text((await app.get(claimPath('tenancy-cya'))).text);
    expect(summary).toContain('Do you have grounds for possession? Yes');
    expect(summary).toContain('What are your grounds for possession? Antisocial behaviourOtherUnlicensed occupier');
    expect(summary).toContain('Why are you making a possession claim? The occupier is a lodger');
    expect(summary).not.toContain('Are you claiming possession because you’re owed rent?');
  });

  it('forgets the assured tenancy grounds once the tenancy is excluded', async () => {
    app = await bootMakeAClaim();
    givenClaim({
      ...EXCLUDED,
      grounds: { hasRentArrearsGrounds: 'YES', rentArrearsGrounds: ['GROUND_8'], hasOtherGrounds: 'NO' },
      rentArrears: { rentAmount: '100000' },
    });
    await app.post(claimPath('excluded-grounds-claim'), { hasExcludedGrounds: 'yes' });
    expect(storedClaim().grounds).toEqual({ hasExcludedGrounds: 'YES' });
    expect(storedClaim().rentArrears).toBeUndefined();
  });

  it('asks for proof of rent arrears only when Rent arrears is a ground', async () => {
    app = await bootMakeAClaim();
    givenClaim({ ...EXCLUDED, grounds: { hasExcludedGrounds: 'YES', excludedGrounds: ['ABSOLUTE_GROUNDS'] } });
    expect(text((await app.get(claimPath('task-list'))).text)).not.toContain('Proof of rent arrears');

    givenClaim({ ...EXCLUDED, grounds: { hasExcludedGrounds: 'YES', excludedGrounds: ['RENT_ARREARS'] } });
    expect(text((await app.get(claimPath('task-list'))).text)).toContain('Proof of rent arrears');
  });
});

describe('the hand-off to Your Support', () => {
  const CLAIM = { eligibility: ELIGIBILITY, claimant: CLAIMANT };

  it('shows the support page with its two choices when Your Support is on', async () => {
    app = await bootMakeAClaim({ flags: { 'cui-your-support-enabled': true } });
    givenClaim(CLAIM);
    const html = (await app.get(claimPath('your-support'))).text;
    const page = text(html);
    expect(page).toContain('Tell us if you need support');
    expect(page).toContain('Examples:');
    expect(buttons(html)).toEqual(['Continue to the questions', 'I do not need any support at this time']);
  });

  it('offers only the skip button when Your Support is off', async () => {
    app = await bootMakeAClaim();
    givenClaim(CLAIM);
    const page = await app.get(claimPath('your-support'));
    expect(buttons(page.text)).toEqual(['I do not need any support at this time']);
  });

  it('sends the claimant to Your Support with the case as the correlation id and a way back', async () => {
    app = await bootMakeAClaim({ flags: { 'cui-your-support-enabled': true } });
    givenClaim({ ...CLAIM, otherInformation: { supportFlags: SUPPORT_FLAGS } });
    const answered = await app.post(claimPath('your-support'), { choice: 'continue' });
    expect(answered.location).toBe('https://cui-ra.test/start');
    expect(ccd.cuiRaRequests).toHaveLength(1);
    expect(ccd.cuiRaRequests[0]).toMatchObject({
      correlationId: CASE_REFERENCE,
      hmctsServiceId: 'AAA3',
      masterFlagCode: 'RA0001',
      existingFlags: { partyName: 'Billy Wright', roleOnCase: 'Claimant' },
    });
    expect(ccd.cuiRaRequests[0].callbackUrl).toMatch(
      new RegExp(`/case/${CASE_REFERENCE}/make-a-claim/reasonable-adjustments/callback/:id$`)
    );
    expect((ccd.cuiRaRequests[0].existingFlags as { details: unknown[] }).details).toHaveLength(1);
  });

  it('goes on to the language used without Your Support when no support is needed and PCQ is off', async () => {
    app = await bootMakeAClaim({ flags: { 'cui-your-support-enabled': true } });
    givenClaim(CLAIM);
    const answered = await app.post(claimPath('your-support'), { choice: 'skip' });
    expect(answered.location).toBe(claimPath('language-used'));
    expect(ccd.cuiRaRequests).toEqual([]);
  });

  it('offers the equality questions next when PCQ is on and up', async () => {
    app = await bootMakeAClaim({ flags: { 'release-1.3-enabled': true, 'cui-pcq-enabled': true } });
    givenClaim(CLAIM);
    expect((await app.post(claimPath('your-support'), { choice: 'skip' })).location).toBe(
      claimPath('equality-and-diversity')
    );
  });

  it('does not offer the equality questions when PCQ is down, or they were already answered or declined', async () => {
    app = await bootMakeAClaim({ flags: { 'release-1.3-enabled': true, 'cui-pcq-enabled': true } });
    givenClaim(CLAIM);
    ccd.pcqStatus = 'DOWN';
    expect((await app.post(claimPath('your-support'), { choice: 'skip' })).location).toBe(claimPath('language-used'));

    ccd.pcqStatus = 'UP';
    givenClaim({ ...CLAIM, otherInformation: { equalityQuestionsChoice: 'SKIP' } });
    expect((await app.post(claimPath('your-support'), { choice: 'skip' })).location).toBe(claimPath('language-used'));
  });

  describe('on return from Your Support', () => {
    const callback = (id = 'payload-1') => `/case/${CASE_REFERENCE}/make-a-claim/reasonable-adjustments/callback/${id}`;
    const flags = {
      replacementFlags: {
        partyName: 'Billy Wright',
        roleOnCase: 'Claimant',
        details: [
          {
            id: 'flag-1',
            value: { name: 'Step free / wheelchair access', status: 'Requested', path: [{ name: 'Party' }] },
          },
        ],
      },
    };

    it('keeps the flags with the claim and carries on to the next page', async () => {
      app = await bootMakeAClaim({
        flags: { 'cui-your-support-enabled': true, 'release-1.3-enabled': true, 'cui-pcq-enabled': true },
      });
      givenClaim(CLAIM);
      ccd.cuiRaPayload = { action: 'submit', correlationId: CASE_REFERENCE, ...flags };
      const returned = await app.get(callback());
      expect(returned.location).toBe(claimPath('equality-and-diversity'));
      expect(storedClaim().otherInformation.supportFlags).toEqual({
        partyName: 'Billy Wright',
        roleOnCase: 'Claimant',
        details: [
          {
            id: 'flag-1',
            value: {
              name: 'Step free / wheelchair access',
              status: 'Requested',
              path: [{ value: 'Party' }],
            },
          },
        ],
      });
    });

    it('saves nothing when the claimant cancels, or the payload is for another case', async () => {
      app = await bootMakeAClaim({ flags: { 'cui-your-support-enabled': true } });
      givenClaim(CLAIM);
      ccd.cuiRaPayload = { action: 'cancel', correlationId: CASE_REFERENCE, ...flags };
      expect((await app.get(callback())).location).toBe(claimPath('language-used'));
      ccd.cuiRaPayload = { action: 'submit', correlationId: '1111111111111111', ...flags };
      expect((await app.get(callback())).location).toBe(claimPath('language-used'));
      expect(storedClaim().otherInformation).toBeUndefined();
    });
  });
});

describe('the hand-off to the PCQ equality questions', () => {
  const CLAIM = { eligibility: ELIGIBILITY, claimant: CLAIMANT };
  const FLAGS = { 'release-1.3-enabled': true, 'cui-pcq-enabled': true };

  it('shows the equality page with its two choices', async () => {
    app = await bootMakeAClaim({ flags: FLAGS });
    givenClaim(CLAIM);
    const html = (await app.get(claimPath('equality-and-diversity'))).text;
    expect(text(html)).toContain('These are optional questions about you');
    expect(buttons(html)).toEqual(['Continue to the questions', 'I do not want to answer these questions']);
  });

  it('hands the claimant to PCQ with the case, a reserved id and the way back, and records that it did', async () => {
    app = await bootMakeAClaim({ flags: FLAGS });
    givenClaim(CLAIM);
    const answered = await app.post(claimPath('equality-and-diversity'), { choice: 'continue' });
    const url = new URL(answered.location ?? '');
    expect(url.origin + url.pathname).toBe(`${process.env.PCQ_URL}/service-endpoint`);
    const params = url.searchParams;
    expect(params.get('serviceId')).toBe('PCS');
    expect(params.get('actor')).toBe('APPLICANT');
    expect(params.get('partyId')).toBe('landlord-uid');
    expect(params.get('ccdCaseId')).toBe(CASE_REFERENCE);
    expect(params.get('returnUrl')).toMatch(new RegExp(`/case/${CASE_REFERENCE}/make-a-claim/language-used$`));
    expect(params.get('returnUrl')).not.toMatch(/^https?:/);
    for (const secure of ['token', 'authTag', 'iv', 'salt']) {
      expect(params.get(secure)).toBeTruthy();
    }
    expect(storedClaim().otherInformation).toEqual({
      equalityQuestionsChoice: 'CONTINUE',
      pcqId: params.get('pcqId'),
    });
  });

  it('does not send the claimant to PCQ a second time', async () => {
    app = await bootMakeAClaim({ flags: FLAGS });
    givenClaim({ ...CLAIM, otherInformation: { equalityQuestionsChoice: 'CONTINUE', pcqId: 'reserved' } });
    const answered = await app.post(claimPath('equality-and-diversity'), { choice: 'continue' });
    expect(answered.location).toBe(`${claimPath('language-used')}?nav=1`);
    expect(storedClaim().otherInformation.pcqId).toBe('reserved');
  });

  it('goes on to the language used when the claimant declines, recording that they did', async () => {
    app = await bootMakeAClaim({ flags: FLAGS });
    givenClaim(CLAIM);
    const answered = await app.post(claimPath('equality-and-diversity'), { choice: 'skip' });
    expect(answered.location).toBe(`${claimPath('language-used')}?nav=1`);
    expect(storedClaim().otherInformation).toEqual({ equalityQuestionsChoice: 'SKIP' });
  });

  it('carries on without recording an answer when PCQ is unavailable', async () => {
    app = await bootMakeAClaim({ flags: FLAGS });
    givenClaim(CLAIM);
    ccd.pcqStatus = 'DOWN';
    const answered = await app.post(claimPath('equality-and-diversity'), { choice: 'continue' });
    expect(answered.location).toBe(`${claimPath('language-used')}?nav=1`);
    expect(storedClaim().otherInformation).toBeUndefined();
  });

  it('shows the support and equality answers on check your answers', async () => {
    app = await bootMakeAClaim();
    givenClaim({
      ...CLAIM,
      otherInformation: { supportFlags: SUPPORT_FLAGS, equalityQuestionsChoice: 'CONTINUE', pcqId: 'reserved' },
    });
    const page = await app.get(claimPath('check-your-answers'));
    const redirected = page.location ? await app.get(page.location) : page;
    expect(redirected.status).toBe(200);
  });
});
