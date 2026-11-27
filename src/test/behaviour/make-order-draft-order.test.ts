import { CASE_REFERENCE, type TestApp, bootApp, check, control, openPage } from './harness';

const PAGE = `/case/${CASE_REFERENCE}/make-order`;
const P = 'app-gen-app-1';

const ADJOURN = {
  id: 'gen-app-1',
  reference: 'GA1',
  type: 'Adjourn the hearing',
  adjournment: true,
  applicant: 'Alex Example (Defendant 1)',
  submittedOn: '2026-10-01',
  listed: false,
  documents: [],
  draftOrderWording:
    '<h3>Adjournment</h3><ol><li>The hearing is <strong>adjourned</strong>.</li><li>Costs reserved.</li></ol>' +
    '<ul><li>The defendant\'s "letter" is filed.</li></ul>',
};

const WARRANT = {
  id: 'gen-app-2',
  reference: 'GA2',
  type: 'Suspend enforcement',
  enforcementSuspension: true,
  applicant: 'Alex Example (Defendant 1)',
  submittedOn: '2026-10-09',
  listed: false,
  documents: [],
  draftOrderWording: ' ',
};

/** The order's lines from "IT IS ORDERED THAT:" on. */
function ordered(text: string): string[] {
  const lines = text.split('\n');
  return lines.slice(lines.indexOf('IT IS ORDERED THAT:'));
}

function addDraftOrder(): void {
  control<HTMLButtonElement>(`[data-application-prefix="${P}"] [data-draft-order]`).click();
}

describe("make an order: the applicant's draft order", () => {
  let app: TestApp;
  beforeEach(async () => {
    app = await bootApp({ applications: [ADJOURN, WARRANT] });
  });
  afterEach(() => app.close());

  it('offers the draft order only on an application with one, naming the application', async () => {
    await openPage((await app.get(PAGE)).text);
    const buttons = [...document.querySelectorAll<HTMLButtonElement>('[data-draft-order]')];
    expect(buttons.map(button => button.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
      'Insert the applicant’s wording from application GA1',
    ]);
    expect(buttons[0].closest<HTMLElement>('[data-application]')?.dataset.applicationReference).toBe('GA1');
  });

  it('adds the draft order as clauses after "IT IS ORDERED THAT:", which undo takes out', async () => {
    const page = await openPage((await app.get(PAGE)).text);
    const before = page.documentText();

    addDraftOrder();

    expect(ordered(page.documentText()).slice(0, 5)).toEqual([
      'IT IS ORDERED THAT:',
      'Adjournment',
      'The hearing is adjourned.',
      'Costs reserved.',
      '• The defendant\'s "letter" is filed.',
    ]);
    const snapshot = JSON.parse(control<HTMLTextAreaElement>('#order-document').value);
    expect(snapshot.current.content.map((node: { type: string }) => node.type)).toEqual(
      expect.arrayContaining(['heading', 'ordered_list', 'bullet_list'])
    );
    const textbox = control<HTMLElement>('#order-editor [role="textbox"]');
    expect(document.activeElement).toBe(textbox);
    expect(control('#order-editor [role="status"]').textContent).toBe('The draft order from application GA1 is added.');

    textbox.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true, cancelable: true }));

    expect(page.documentText()).toBe(before);
  });

  it("keeps the draft order as the judge changes that application's decision", async () => {
    const page = await openPage((await app.get(PAGE)).text);
    addDraftOrder();

    check(`${P}-decision`, 'dismiss');
    check(`${P}-decision`, 'none');

    expect(page.documentText()).toContain('The hearing is adjourned.');
    expect(page.documentText()).toContain('Costs reserved.');
  });
});
