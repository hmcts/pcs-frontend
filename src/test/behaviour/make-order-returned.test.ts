import { CASE_REFERENCE, type TestApp, bootApp, openPage, recordAttendance, submittedOrders } from './harness';

const PAGE = `/case/${CASE_REFERENCE}/make-order`;
const RETURNED = `${PAGE}?orderId=order-returned&taskId=task-2`;

function parse(html: string): Document {
  return new DOMParser().parseFromString(html, 'text/html');
}

describe('make an order: an order a caseworker returned', () => {
  let app: TestApp;
  afterEach(() => app.close());

  it("shows the judge the caseworker's query on the order they chose, and sends it for review again", async () => {
    app = await bootApp({
      orderReturnedToJudge: { queryFromCaseworker: 'Which defendant does paragraph 2 mean?' },
    });

    const page = await openPage((await app.get(RETURNED)).text);
    expect(document.querySelector('#caseworker-query')?.textContent).toContain(
      'Which defendant does paragraph 2 mean?'
    );

    // The query stays on the page when the order cannot be sent yet.
    const incomplete = await app.post(RETURNED, page.body('SUBMIT_FOR_REVIEW'));
    expect(incomplete.status).toBe(400);
    expect(parse(incomplete.text).querySelector('#caseworker-query')?.textContent).toContain(
      'Which defendant does paragraph 2 mean?'
    );

    recordAttendance();
    const sent = await app.post(RETURNED, page.body('SUBMIT_FOR_REVIEW'));
    expect(sent.location).toBe(`${PAGE}/sent-for-review`);
    // The judge's task, which the link named, goes back with the order so pcs-api can close it.
    expect(submittedOrders().at(-1)).toMatchObject({ taskId: 'task-2' });

    // The same order is with the caseworker again, so it is no longer the judge's to change.
    const again = parse((await app.get(RETURNED)).text);
    expect(again.querySelector('h1')?.textContent?.trim()).toBe('No order to change');
    expect(again.body.textContent).toContain('The order is no longer waiting for you to change it');
  });

  it('starts a new order, without the query, when the judge has not chosen the returned one', async () => {
    app = await bootApp({
      orderReturnedToJudge: { queryFromCaseworker: 'Which defendant does paragraph 2 mean?' },
    });

    await openPage((await app.get(PAGE)).text);

    expect(document.querySelector('#caseworker-query')).toBeNull();
    expect(document.querySelector<HTMLInputElement>('input[name="orderId"]')?.value).toBe('');
  });
});
