import { decodeBase64UrlJson, encodeBase64UrlJson } from '@utils/base64Json';

describe('base64Json', () => {
  it('round-trips an object through base64url', () => {
    const doc = { index: 0, id: 'abc', document_filename: 'rentArrears.pdf' };
    const encoded = encodeBase64UrlJson(doc);
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/); // no { } " : , — WAF-safe
    expect(decodeBase64UrlJson(encoded)).toEqual(doc);
  });

  it('handles non-ASCII filenames', () => {
    const doc = { document_filename: 'café-déjà-vu.pdf' };
    expect(decodeBase64UrlJson(encodeBase64UrlJson(doc))).toEqual(doc);
  });

  it('still decodes legacy raw JSON', () => {
    const doc = { index: 1, document_filename: 'x.pdf' };
    expect(decodeBase64UrlJson(JSON.stringify(doc))).toEqual(doc);
  });

  it('returns null for malformed input', () => {
    expect(decodeBase64UrlJson('not json')).toBeNull();
    expect(decodeBase64UrlJson('')).toBeNull();
  });

  it('rejects JSON arrays and primitives', () => {
    expect(decodeBase64UrlJson(encodeBase64UrlJson([1, 2]))).toBeNull();
    expect(decodeBase64UrlJson(encodeBase64UrlJson('string'))).toBeNull();
    expect(decodeBase64UrlJson(encodeBase64UrlJson(42))).toBeNull();
  });
});
