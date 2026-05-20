import type { Request } from 'express';

import {
  parseUploadedDocumentsFromBody,
  wireFileUploadOnPostError,
  wireFileUploadUrls,
} from '../../../../../main/modules/steps/formBuilder/fileUploadUtils';

import type { DocumentStorage } from '@modules/documents/storage';
import type { BuiltFormContent } from '@modules/steps/formBuilder/formFieldConfig.interface';

const stubStorage: DocumentStorage = {
  read: jest.fn(async () => []),
  readFresh: jest.fn(async () => []),
  save: jest.fn(async () => {}),
};

function makeFileUploadForm(overrides: { uploadUrl?: string; deleteUrl?: string; value?: unknown } = {}) {
  return {
    fields: [
      {
        name: 'documents',
        type: 'file' as const,
        componentType: 'fileUpload',
        component: {
          uploadUrl: overrides.uploadUrl ?? '',
          deleteUrl: overrides.deleteUrl ?? '',
          value: overrides.value ?? [],
        },
      },
    ],
  } as BuiltFormContent;
}

function makeRequest(partial: Partial<Request>): Request {
  return {
    originalUrl: '/case/1771325608502536/respond-to-claim/step-name',
    body: {},
    ...partial,
  } as Request;
}

describe('fileUploadUtils', () => {
  describe('parseUploadedDocumentsFromBody', () => {
    it('returns empty array when key is missing', () => {
      expect(parseUploadedDocumentsFromBody({})).toEqual([]);
      expect(parseUploadedDocumentsFromBody({ other: 'x' })).toEqual([]);
    });

    it('parses a single JSON object string', () => {
      const doc = { index: 0, document_filename: 'x.pdf', id: 'id-1' };
      expect(parseUploadedDocumentsFromBody({ 'uploadedDocuments[]': JSON.stringify(doc) })).toEqual([doc]);
    });

    it('parses an array of JSON strings', () => {
      expect(
        parseUploadedDocumentsFromBody({
          'uploadedDocuments[]': [
            JSON.stringify({ index: 0, document_filename: 'a.pdf' }),
            JSON.stringify({ index: 1, document_filename: 'b.pdf' }),
          ],
        })
      ).toEqual([
        { index: 0, document_filename: 'a.pdf' },
        { index: 1, document_filename: 'b.pdf' },
      ]);
    });

    it('skips non-string and malformed entries', () => {
      expect(
        parseUploadedDocumentsFromBody({
          'uploadedDocuments[]': [
            'not-json',
            JSON.stringify({ index: 1, document_filename: 'ok.pdf' }),
            123 as unknown as string,
          ],
        })
      ).toEqual([{ index: 1, document_filename: 'ok.pdf' }]);
    });

    it('drops JSON arrays/primitives', () => {
      expect(parseUploadedDocumentsFromBody({ 'uploadedDocuments[]': '[1,2]' })).toEqual([]);
      expect(parseUploadedDocumentsFromBody({ 'uploadedDocuments[]': '"string"' })).toEqual([]);
    });
  });

  describe('wireFileUploadUrls', () => {
    it('does nothing when documentStorage is undefined', () => {
      const form = makeFileUploadForm();
      wireFileUploadUrls(form, makeRequest({}), undefined);
      expect(form.fields[0].component?.uploadUrl).toBe('');
      expect(form.fields[0].component?.deleteUrl).toBe('');
    });

    it('sets upload and delete URLs from originalUrl base path without query string', () => {
      const form = makeFileUploadForm();
      const req = makeRequest({
        originalUrl: '/case/abc/respond-to-claim/foo?csrf=xyz',
      });
      wireFileUploadUrls(form, req, stubStorage);
      expect(form.fields[0].component?.uploadUrl).toBe('/case/abc/respond-to-claim/foo/upload');
      expect(form.fields[0].component?.deleteUrl).toBe('/case/abc/respond-to-claim/foo/delete');
    });

    it('no-op when there is no fileUpload field', () => {
      const form = { fields: [{ name: 'x', type: 'text', componentType: 'input', component: {} }] } as BuiltFormContent;
      wireFileUploadUrls(form, makeRequest({}), stubStorage);
      expect(form.fields[0].component?.uploadUrl).toBeUndefined();
    });
  });

  describe('wireFileUploadOnPostError', () => {
    it('runs wireFileUploadUrls then overwrites component.value from body', () => {
      const form = makeFileUploadForm({ value: ['stale'] });
      const req = makeRequest({
        body: {
          'uploadedDocuments[]': JSON.stringify({ index: 0, document_filename: 'new.pdf' }),
        },
      });
      wireFileUploadOnPostError(form, req, stubStorage);
      expect(form.fields[0].component?.uploadUrl).toContain('/upload');
      expect(form.fields[0].component?.deleteUrl).toContain('/delete');
      expect(form.fields[0].component?.value).toEqual([{ index: 0, document_filename: 'new.pdf' }]);
    });

    it('does not mutate URLs or value without documentStorage', () => {
      const form = makeFileUploadForm();
      const req = makeRequest({
        body: {
          'uploadedDocuments[]': JSON.stringify({ index: 0, document_filename: 'only.pdf' }),
        },
      });
      wireFileUploadOnPostError(form, req, undefined);
      expect(form.fields[0].component?.uploadUrl).toBe('');
      expect(form.fields[0].component?.value).toEqual([]);
    });
  });
});
