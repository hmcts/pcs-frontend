import {
  CASE_REFERENCE,
  type TestApp,
  bootApp,
  check,
  control,
  openPage,
  selectTab,
  type,
  typeDate,
  uncheck,
} from './harness';

const PAGE = `/case/${CASE_REFERENCE}/make-order`;

describe('make an order: adjournment', () => {
  let app: TestApp;
  beforeEach(async () => {
    app = await bootApp();
  });
  afterEach(() => app.close());

  it('adjourns to a specific hearing with directions', async () => {
    const page = await openPage((await app.get(PAGE)).text);
    selectTab('tab-adjournment');
    check('adj-type', 'further-hearing');
    expect(control('[name="adj-when"][value="next-list"]').checked).toBe(true);

    // Filling in a listing option's date selects that option.
    typeDate('adj-hearing-date-specific', '1', '10', '2026');
    expect(control('[name="adj-when"][value="specific"]').checked).toBe(true);
    type('adj-specific-time', '10:30am');
    type('adj-time-estimate', '1');
    type('adj-time-estimate-unit', 'hours');
    check('adj-directions', 'defence');
    typeDate('adj-defence-date', '15', '9', '2026');

    expect(page.orderText()).toBe(
      [
        'IT IS ORDERED THAT:',
        'The claim shall be adjourned to be heard on 1 October 2026 at 10:30am with a time estimate of 1 hour.',
        'The defendant must by 4pm on 15 September 2026 send to the court and all other parties a defence.',
      ].join('\n')
    );

    // Conflicting directions are rejected with the answers kept.
    check('adj-directions', 'counterclaim');
    typeDate('adj-counterclaim-date', '15', '9', '2026');
    const body = page.body();
    body.set('action', 'SUBMIT_FOR_REVIEW');
    const rejected = await app.post(PAGE, body);
    expect(rejected.status).toBe(400);
    page.dispose();
    await openPage(rejected.text);
    expect(control('#make-order-error-summary').textContent).toContain(
      'Select either defence or defence and any counterclaim, not both'
    );
    expect(control('#adj-directions-error').textContent).toContain('not both');
    expect(control('[name="adj-specific-time"]').value).toBe('10:30am');
    expect(control('[name="adj-directions"][value="counterclaim"]').checked).toBe(true);
  });

  it('adjourns generally on payment conditions with automatic strike out', async () => {
    const page = await openPage((await app.get(PAGE)).text);
    selectTab('tab-adjournment');
    check('adj-type', 'generally');
    check('adj-gen', 'current-rent-plus');
    type('adj-gen-current-rent-plus-amount', '50');
    typeDate('adj-gen-current-rent-plus-date', '1', '10', '2026');
    check('adj-gen', 'restore');
    typeDate('adj-gen-restore-date', '1', '3', '2027');

    expect(page.orderText()).toBe(
      [
        'IT IS ORDERED THAT:',
        'The claim is adjourned generally on condition that the defendant makes payment of current rent as it falls due together with the following payments towards any arrears:',
        'instalment payments to the claimant of £50.00 every month, the first instalment to be paid on or before 1 October 2026;',
        'The claimant may apply to restore the claim if there is a breach of such condition or conditions. This application shall be made on notice to all parties. The claimant shall set out in such application details of the alleged breach or breaches and attach any evidence relied upon in support.',
        'If no application to restore the claim is made by 1 March 2027 the claim shall stand as struck out without further application or order of the court.',
      ].join('\n')
    );

    // Without payment conditions the claim is simply adjourned with liberty to restore.
    uncheck('adj-gen', 'current-rent-plus');
    expect(page.orderText()).toContain(
      'This claim is adjourned generally with liberty to restore by application by any party on notice to all other parties. If no application is made by 4pm on 1 March 2027 the claim shall automatically be struck out without the need for any further application or order.'
    );
    page.dispose();
  });
});
