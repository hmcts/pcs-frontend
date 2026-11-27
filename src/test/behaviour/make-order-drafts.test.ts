import { renderText } from '@hmcts-cft/docweave';

import {
  CASE_REFERENCE,
  type TestApp,
  bootApp,
  control,
  openPage,
  recordAttendance,
  selectTab,
  submittedOrders,
} from './harness';

const PAGE = `/case/${CASE_REFERENCE}/make-order`;

// As pcs-api sends them: newest first.
const DRAFTS = [
  {
    id: '7d1c9a52-0000-4000-8000-000000000002',
    party: 'Jane Doe (Defendant 1)',
    submittedAt: '2026-06-20T23:30:00Z',
    wording: '<p>The claim is <strong>dismissed</strong>.</p><ol><li>No order as to costs.</li></ol>',
  },
  {
    id: '7d1c9a52-0000-4000-8000-000000000001',
    party: 'Example Housing (Claimant)',
    submittedAt: '2026-05-02T10:00:00Z',
    wording: '<p>The defendant gives up possession.</p>',
  },
];

/** The order's lines from "IT IS ORDERED THAT:" on. */
function ordered(text: string): string[] {
  const lines = text.split('\n');
  return lines.slice(lines.indexOf('IT IS ORDERED THAT:'));
}

function useDraft(index: number): void {
  document.querySelectorAll<HTMLButtonElement>('#tab-drafts [data-draft-order]')[index].click();
}

type Submitted = { order: { orderType: string; docweaveSnapshot: Parameters<typeof renderText>[0] } };

describe("make an order: the parties' drafts", () => {
  let app: TestApp;
  afterEach(() => app.close());

  it('has no drafts tab while no party has filed a draft', async () => {
    app = await bootApp();
    await openPage((await app.get(PAGE)).text);
    expect(document.querySelector('#tab-drafts')).toBeNull();
    expect(document.querySelector('a[href="#tab-drafts"]')).toBeNull();
  });

  describe('with drafts filed', () => {
    beforeEach(async () => {
      app = await bootApp({ drafts: DRAFTS });
    });

    it('lists them newest first, with who filed each, when, and its wording', async () => {
      await openPage((await app.get(PAGE)).text);
      expect(control('a[href="#tab-drafts"]').textContent?.trim()).toBe('Drafts');
      const drafts = [...document.querySelectorAll<HTMLElement>('#tab-drafts [data-filed-draft]')];
      expect(drafts.map(draft => draft.querySelector('h4')?.textContent)).toEqual([
        'Jane Doe (Defendant 1)',
        'Example Housing (Claimant)',
      ]);
      // A filing late in the evening in British Summer Time is dated by the day in London.
      expect(drafts.map(draft => draft.querySelector('p')?.textContent)).toEqual([
        'Filed on 21 June 2026',
        'Filed on 2 May 2026',
      ]);
      expect(drafts[0].querySelector('[data-draft-wording] strong')?.textContent).toBe('dismissed');
      expect(drafts[0].querySelector('[data-draft-wording] li')?.textContent).toBe('No order as to costs.');
      expect(drafts.map(draft => draft.querySelector('button')?.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
        'Add this draft to the order from Jane Doe (Defendant 1), filed on 21 June 2026',
        'Add this draft to the order from Example Housing (Claimant), filed on 2 May 2026',
      ]);
    });

    it('leaves the order type as it was when the judge opens the drafts', async () => {
      const page = await openPage((await app.get(PAGE)).text);
      selectTab('tab-suspended');
      const before = page.orderText();

      selectTab('tab-drafts');

      expect(control('#order-type').value).toBe('SUSPENDED_POSSESSION');
      expect(page.orderText()).toBe(before);
      const body = page.body('SAVE_DRAFT');
      expect(body.get('orderType')).toBe('SUSPENDED_POSSESSION');
    });

    it('adds a draft to the order as a free form one, its wording after "IT IS ORDERED THAT:"', async () => {
      const page = await openPage((await app.get(PAGE)).text);
      selectTab('tab-suspended');

      useDraft(0);

      // GOV.UK tabs open the tab the fragment names.
      expect(window.location.hash).toBe('#tab-free-form');
      expect(control('#order-type').value).toBe('FREE_FORM');
      expect(ordered(page.documentText())).toEqual([
        'IT IS ORDERED THAT:',
        'The claim is dismissed.',
        'No order as to costs.',
      ]);
      expect(control('#order-editor [role="status"]').textContent).toBe(
        'The draft from Jane Doe (Defendant 1) is added.'
      );

      recordAttendance();
      expect((await app.post(PAGE, page.body('SUBMIT_FOR_REVIEW'))).status).toBe(302);
      const [submitted] = submittedOrders() as Submitted[];
      expect(submitted.order.orderType).toBe('FREE_FORM');
      expect(renderText(submitted.order.docweaveSnapshot)).toContain('IT IS ORDERED THAT:\nThe claim is dismissed.');
    });
  });

  it('leaves out a draft with no wording, and the tab with it if it was the only one', async () => {
    const blank = { ...DRAFTS[1], id: '7d1c9a52-0000-4000-8000-000000000003', wording: '<p> </p>' };
    app = await bootApp({ drafts: [DRAFTS[0], blank] });
    await openPage((await app.get(PAGE)).text);
    expect(document.querySelectorAll('#tab-drafts [data-filed-draft]')).toHaveLength(1);

    await app.close();
    app = await bootApp({ drafts: [blank] });
    await openPage((await app.get(PAGE)).text);
    expect(document.querySelector('a[href="#tab-drafts"]')).toBeNull();
  });
});
