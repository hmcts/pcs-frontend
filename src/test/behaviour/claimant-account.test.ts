/**
 * @jest-environment node
 */
import { JSDOM } from 'jsdom';

import { CASE_REFERENCE, type TestApp, bootMakeAClaim, ccd, givenClaim } from './makeAClaimHarness';

const SUBMISSION = { submission: { serviceRequestReference: 'SR-1', feeAmount: '40400' } };
const PAID = { submission: { ...SUBMISSION.submission, paymentStatus: 'PAID' } };

let app: TestApp;
afterEach(() => app?.close());

async function pageOf(path: string): Promise<Document> {
  return new JSDOM((await app.get(path)).text).window.document;
}

function linkNamed(page: Document, name: string): HTMLAnchorElement | undefined {
  return [...page.querySelectorAll('a')].find(a => a.textContent?.trim() === name);
}

describe('your property possession account', () => {
  it('lists a draft claim linking to its task list', async () => {
    app = await bootMakeAClaim();
    givenClaim({});

    const page = await pageOf('/claims');

    expect(page.querySelector('h1')?.textContent).toBe('Your property possession account');
    expect(page.querySelector('h2')?.textContent).toBe('Claims you’ve made');
    expect([...page.querySelectorAll('th')].map(th => th.textContent?.trim())).toEqual(['Claim state', 'Claim number']);
    expect(linkNamed(page, 'Draft claim')?.getAttribute('href')).toBe(`/case/${CASE_REFERENCE}/make-a-claim/task-list`);
    expect(page.querySelector('tbody')?.textContent).toContain(CASE_REFERENCE);
  });

  it('lists a submitted claim linking to its dashboard', async () => {
    app = await bootMakeAClaim();
    givenClaim(SUBMISSION, 'CASE_ISSUED');

    const page = await pageOf('/claims');

    expect(linkNamed(page, 'Submitted claim')?.getAttribute('href')).toBe(`/case/${CASE_REFERENCE}/claimant-dashboard`);
  });

  it('offers to make a claim, whether or not the claimant has made any', async () => {
    app = await bootMakeAClaim();

    const page = await pageOf('/claims');

    expect(linkNamed(page, 'Make a housing possession claim')?.getAttribute('href')).toBe('/make-a-claim');
    expect(page.querySelector('main')?.textContent).toContain('You have not made any claims.');
    expect(page.querySelector('main')?.textContent).toContain('Contact us for help');
  });

  it('keeps the claims made against the claimant in a second section', async () => {
    app = await bootMakeAClaim();
    givenClaim({});
    ccd.claimsAgainst = [{ caseReference: '1111222233334444', claimantName: 'Acme Ltd', propertyPostcode: 'SW1A 1AA' }];

    const page = await pageOf('/claims');

    const headings = [...(page.querySelector('main')?.querySelectorAll('h2') ?? [])].map(h => h.textContent);
    expect(headings).toEqual(['Claims you’ve made', 'Claims made against you']);
    expect(linkNamed(page, 'View claim')?.getAttribute('href')).toBe('/case/1111222233334444/dashboard');
  });

  it('shows only the claims against a citizen while the journey is switched off', async () => {
    app = await bootMakeAClaim({ enabled: false });
    givenClaim({});
    ccd.claimsAgainst = [{ caseReference: '1111222233334444', claimantName: 'Acme Ltd', propertyPostcode: 'SW1A 1AA' }];

    const page = await pageOf('/claims');

    expect(page.querySelector('h1')?.textContent).toBe('Your Possession Claims account');
    expect(linkNamed(page, 'Make a housing possession claim')).toBeUndefined();
    expect(linkNamed(page, 'Draft claim')).toBeUndefined();
    expect(linkNamed(page, 'View claim')).toBeDefined();
  });
});

describe('claimant dashboard', () => {
  it('shows the property address, claim state, claim form, documents and contact details', async () => {
    app = await bootMakeAClaim();
    givenClaim(SUBMISSION, 'PENDING_CASE_ISSUED');

    const page = await pageOf(`/case/${CASE_REFERENCE}/claimant-dashboard`);

    expect(page.querySelector('h1')?.textContent?.trim()).toBe('15 Garden Drive, Luton, LU1 1AB');
    expect(page.body.textContent).toContain('Case number: 1777 0276 0001 7761');
    expect(page.body.textContent).toContain('You’ve made a property possession claim');
    expect(linkNamed(page, 'View the claim form')?.getAttribute('href')).toBe(`/case/${CASE_REFERENCE}/view-documents`);
    expect(linkNamed(page, 'View documents')?.getAttribute('href')).toBe(`/case/${CASE_REFERENCE}/view-documents`);
    expect(page.body.textContent).toContain('Contact us for help');
  });

  it('offers a general application only once the claim fee is paid', async () => {
    app = await bootMakeAClaim();
    const name = 'Ask the court to make an order (make a general application)';

    givenClaim(SUBMISSION, 'PENDING_CASE_ISSUED');
    expect(linkNamed(await pageOf(`/case/${CASE_REFERENCE}/claimant-dashboard`), name)).toBeUndefined();

    givenClaim(PAID, 'CASE_ISSUED');
    expect(linkNamed(await pageOf(`/case/${CASE_REFERENCE}/claimant-dashboard`), name)?.getAttribute('href')).toBe(
      `/case/${CASE_REFERENCE}/make-an-application/choose-an-application`
    );
  });

  it('sends a draft claim to its task list', async () => {
    app = await bootMakeAClaim();
    givenClaim({});

    const response = await app.get(`/case/${CASE_REFERENCE}/claimant-dashboard`);

    expect(response.location).toBe(`/case/${CASE_REFERENCE}/make-a-claim/task-list`);
  });

  it('is not found for a case the citizen did not create', async () => {
    app = await bootMakeAClaim();
    givenClaim(PAID, 'CASE_ISSUED');
    ccd.storedCaseIsTheirs = false;

    expect((await app.get(`/case/${CASE_REFERENCE}/claimant-dashboard`)).status).toBe(404);
  });

  it('is not found while the journey is switched off', async () => {
    app = await bootMakeAClaim({ enabled: false });
    givenClaim(PAID, 'CASE_ISSUED');

    expect((await app.get(`/case/${CASE_REFERENCE}/claimant-dashboard`)).status).toBe(404);
  });

  it('is where the documents page goes back to for the claimant', async () => {
    app = await bootMakeAClaim();
    givenClaim(PAID, 'CASE_ISSUED');

    const page = await pageOf(`/case/${CASE_REFERENCE}/view-documents`);

    expect(page.querySelector('.govuk-back-link')?.getAttribute('href')).toBe(
      `/case/${CASE_REFERENCE}/claimant-dashboard`
    );
  });

  it('is not where the documents page goes back to for someone else', async () => {
    app = await bootMakeAClaim();
    givenClaim(PAID, 'CASE_ISSUED');
    ccd.storedCaseIsTheirs = false;

    const page = await pageOf(`/case/${CASE_REFERENCE}/view-documents`);

    expect(page.querySelector('.govuk-back-link')?.getAttribute('href')).toBe(`/case/${CASE_REFERENCE}/dashboard`);
  });
});
