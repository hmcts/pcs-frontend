import * as path from 'path';

import * as nunjucks from 'nunjucks';

const env = new nunjucks.Environment(
  new nunjucks.FileSystemLoader([
    path.join(__dirname, '..', '..', '..', 'main', 'views'),
    path.dirname(require.resolve('govuk-frontend/package.json')) + '/dist',
  ])
);

env.addFilter('date', (value: string) => value);

const template = `
{% from "macros/documentList.njk" import pcsDocumentList %}
{{ pcsDocumentList(folder, caseReference, submittedOnLabel) }}
`;

function render(folder: { title: string; documents: { id: string; filename: string; submittedOn: string | null }[] }) {
  return env.renderString(template, {
    folder,
    caseReference: '1777570813792018',
    submittedOnLabel: 'Submitted on',
  });
}

describe('shared document list macro', () => {
  it('links each document to the case document route', () => {
    const html = render({
      title: 'Enforcement',
      documents: [{ id: 'f0a1', filename: 'notice-of-eviction.pdf', submittedOn: '2026-07-01' }],
    });

    expect(html).toContain('Enforcement');
    expect(html).toContain('href="/case/1777570813792018/view-documents/f0a1"');
    expect(html).toContain('notice-of-eviction.pdf');
    expect(html).toContain('Submitted on 2026-07-01');
  });

  it('omits the submitted on line when the document has no timestamp', () => {
    const html = render({
      title: 'Enforcement',
      documents: [{ id: 'f0a1', filename: 'notice-of-eviction.pdf', submittedOn: null }],
    });

    expect(html).not.toContain('Submitted on');
  });
});
