import { Environment } from 'nunjucks';

import { base64json } from '../../../../../main/modules/nunjucks/filters/base64json';
import { parseUploadedDocumentsFromBody } from '../../../../../main/modules/steps/formBuilder/fileUploadUtils';

// Locks the macro -> parse contract: filter encodes, parseUploadedDocumentsFromBody decodes.
function renderHiddenInput(file: unknown): string {
  const env = new Environment(null, { autoescape: true });
  env.addFilter('base64json', base64json as (...args: unknown[]) => unknown);
  return env.renderString('<input value="{{ file | base64json }}" />', { file });
}

function extractValues(html: string): string[] {
  return [...html.matchAll(/value="([^"]*)"/g)].map(m => m[1]);
}

describe('base64json filter (server render -> parse round-trip)', () => {
  it('renders a WAF-safe value with no SQLi punctuation', () => {
    const [value] = extractValues(renderHiddenInput({ index: 0, id: 'id-1', document_filename: 'rentArrears.pdf' }));
    // base64url alphabet only — none of the { } " : , chars CRS flags as SQLi
    expect(value).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('round-trips the rendered value back through parseUploadedDocumentsFromBody', () => {
    const file = { index: 0, id: 'id-1', document_filename: 'rentArrears.pdf' };
    const [value] = extractValues(renderHiddenInput(file));
    expect(parseUploadedDocumentsFromBody({ 'uploadedDocuments[]': value })).toEqual([file]);
  });

  it('survives autoescape and non-ASCII filenames', () => {
    const file = { index: 0, document_filename: 'café-déjà.pdf' };
    const [value] = extractValues(renderHiddenInput(file));
    expect(value).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(parseUploadedDocumentsFromBody({ 'uploadedDocuments[]': value })).toEqual([file]);
  });
});
