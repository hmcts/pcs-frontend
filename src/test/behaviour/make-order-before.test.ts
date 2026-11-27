import { buildDoc, createDocEditor } from '@hmcts-cft/docweave';

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

  it('opens a draft saved with the court before the date and keeps the judge’s clauses', async () => {
    const editor = createDocEditor({ mount: document.createElement('div'), label: 'Order' });
    editor.render(
      buildDoc(order => {
        order.paragraph('before', content =>
          content
            .text('This order is made by ')
            .fact('before-judge', 'District Judge Sam Judge')
            .text(' at the ')
            .fact('before-court', 'County Court at Bristol')
            .text(' on ')
            .fact('before-date', '13 October 2026')
            .text('.')
        );
        order.paragraph('ordered-that', 'IT IS ORDERED THAT:');
      })
    );
    editor.insert(['The parties may apply to vary this order.'], { at: 'end' });
    const docweaveSnapshot = editor.getSnapshot();
    editor.destroy();

    app = await bootApp({ order: { id: 'draft-order', orderType: 'FREE_FORM', docweaveSnapshot } });
    const page = await openPage((await app.get(PAGE)).text);
    expect(document.querySelector('#order-editor')?.textContent).toContain(BEFORE_HEARING);
    expect(page.documentText()).toContain('The parties may apply to vary this order.');
  });

  it('gives today for an order made without a hearing', async () => {
    app = await bootApp({ hearing: null });
    const page = await openPage((await app.get(PAGE)).text);
    expect(page.openingText()).toBe(beforeToday());
  });

  it('names the judge and court as pcs-api does, placeholders for the judge to fill in included', async () => {
    app = await bootApp({ judge: '[judge’s name and title]', court: '[court]' });
    expect((await openPage((await app.get(PAGE)).text)).openingText()).toBe(
      'This order is made by [judge’s name and title] on 13 October 2026 at the [court].'
    );
  });

  it('gives the case’s facts as they are, even text that would end the script the page sends them in', async () => {
    app = await bootApp({ judge: 'District Judge Sam </script><b>Judge</b> & Co' });
    expect((await openPage((await app.get(PAGE)).text)).openingText()).toBe(
      'This order is made by District Judge Sam </script><b>Judge</b> & Co on 13 October 2026 at the County Court at Bristol.'
    );
  });
});
