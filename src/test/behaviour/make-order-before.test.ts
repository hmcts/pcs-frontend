import { BEFORE_HEARING, CASE_REFERENCE, type TestApp, beforeToday, bootApp, openPage } from './harness';

const PAGE = `/case/${CASE_REFERENCE}/make-order`;

describe('make an order: before whom, where and when it was made', () => {
  let app: TestApp;
  afterEach(() => app.close());

  it('opens with the judge, as a District Judge, at the court managing the case, on the hearing date', async () => {
    app = await bootApp();
    const page = await openPage((await app.get(PAGE)).text);
    expect(page.openingText()).toBe(BEFORE_HEARING);
  });

  it('gives today for an order made without a hearing', async () => {
    app = await bootApp({ hearing: null });
    const page = await openPage((await app.get(PAGE)).text);
    expect(page.openingText()).toBe(beforeToday());
  });

  it('names the court with its venue, and leaves what pcs-api does not know for the judge to fill in', async () => {
    app = await bootApp({ court: { name: 'County Court at Bristol', venueShortName: 'Bristol Civil Justice Centre' } });
    expect((await openPage((await app.get(PAGE)).text)).openingText()).toBe(
      'Before District Judge Sam Judge sitting at the County Court at Bristol Bristol Civil Justice Centre on 13 October 2026'
    );
    await app.close();

    app = await bootApp({ judgeName: null, court: null });
    expect((await openPage((await app.get(PAGE)).text)).openingText()).toBe(
      'Before [judge’s name and title] sitting at the [court] on 13 October 2026'
    );
  });

  it('gives the case’s facts as they are, even text that would end the script the page sends them in', async () => {
    app = await bootApp({ judgeName: 'Sam </script><b>Judge</b> & Co' });
    expect((await openPage((await app.get(PAGE)).text)).openingText()).toBe(
      'Before District Judge Sam </script><b>Judge</b> & Co sitting at the County Court at Bristol on 13 October 2026'
    );
  });
});
