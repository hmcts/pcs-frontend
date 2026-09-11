import { CASE_REFERENCE, type TestApp, bootApp, check, control, openPage, selectTab, type } from './harness';

const PAGE = `/case/${CASE_REFERENCE}/make-order`;

describe('make an order: free form and strike out', () => {
  let app: TestApp;
  beforeEach(async () => {
    app = await bootApp();
  });
  afterEach(() => app.close());

  it('turns free-form paragraphs into the order and requires some wording', async () => {
    const page = await openPage((await app.get(PAGE)).text);
    selectTab('tab-free-form');
    check('recitals', 'yes');
    type('recital', 'UPON hearing the parties');

    const body = page.body();
    body.set('action', 'SUBMIT_FOR_REVIEW');
    const rejected = await app.post(PAGE, body);
    expect(rejected.status).toBe(400);
    expect(rejected.text).toContain('Enter the order wording');

    type('free-form-text', 'The claim is stayed.\n\nLiberty to apply.');
    expect(page.orderText()).toBe(
      ['UPON hearing the parties', 'IT IS ORDERED THAT:', 'The claim is stayed.', 'Liberty to apply.'].join('\n')
    );
    page.dispose();
  });

  it('records the strike out or dismissal outcome', async () => {
    const page = await openPage((await app.get(PAGE)).text);
    selectTab('tab-strike-out');
    check('strike-claim-outcome', 'dismissed');
    expect(page.orderText()).toBe('');

    const body = page.body();
    body.set('action', 'SUBMIT_FOR_REVIEW');
    expect((await app.post(PAGE, body)).status).toBe(302);
    expect(control('[name="strike-claim-outcome"][value="dismissed"]').checked).toBe(true);
    page.dispose();
  });
});
