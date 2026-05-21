import { formatCaseReferenceForDisplay } from '@utils/caseReference';
import { extractViewDocumentFolders } from '@utils/documentUtils';

describe('documentUtils', () => {
  it('extracts documents only from supported categories', () => {
    const folders = extractViewDocumentFolders({
      allDocuments: [
        {
          id: '1',
          value: {
            document_filename: 'claim-form.pdf',
            document_binary_url: 'http://doc-store/claim-form/binary',
            category_id: 'statementsOfCase',
            upload_timestamp: '2026-06-24T10:00:00.000Z',
          },
        },
        {
          id: '2',
          value: {
            document_filename: 'ignore-me.pdf',
            document_binary_url: 'http://doc-store/ignore-me/binary',
            category_id: 'unsupportedFolder',
            upload_timestamp: '2026-06-24T10:00:00.000Z',
          },
        },
        {
          id: '3',
          value: {
            document_filename: 'rent-statement.pdf',
            document_binary_url: 'http://doc-store/rent-statement',
            category_id: 'evidence',
            upload_timestamp: '2026-06-25',
          },
        },
      ],
    });

    expect(folders).toEqual([
      {
        title: 'Statements of case',
        documents: [
          {
            id: '1',
            filename: 'claim-form.pdf',
            submittedOn: '2026-06-24T10:00:00.000Z',
          },
        ],
      },
      {
        title: 'Evidence',
        documents: [
          {
            id: '3',
            filename: 'rent-statement.pdf',
            submittedOn: '2026-06-25',
          },
        ],
      },
    ]);
  });

  it('hides folders with no documents', () => {
    const folders = extractViewDocumentFolders({
      allDocuments: [
        {
          id: '1',
          value: {
            document_filename: 'rent-statement.pdf',
            document_binary_url: 'http://doc-store/rent-statement/binary',
            category_id: 'propertyDocuments',
          },
        },
      ],
    });

    expect(folders).toEqual([
      {
        title: 'Property documents',
        documents: [
          {
            id: '1',
            filename: 'rent-statement.pdf',
            submittedOn: null,
          },
        ],
      },
    ]);
  });

  it('extracts documents from pcs-api allDocuments payload shape', () => {
    const folders = extractViewDocumentFolders({
      allDocuments: [
        {
          id: '1',
          value: {
            document_filename: 'notice.pdf',
            document_binary_url: 'http://doc-store/notice/binary',
            category_id: 'statementsOfCase',
          },
        },
        {
          id: '2',
          value: {
            document_filename: 'certificate.pdf',
            document_binary_url: 'http://doc-store/certificate/binary',
            category_id: 'correspondence',
          },
        },
      ],
    });

    expect(folders).toEqual([
      {
        title: 'Statements of case',
        documents: [
          {
            id: '1',
            filename: 'notice.pdf',
            submittedOn: null,
          },
        ],
      },
      {
        title: 'Correspondence',
        documents: [
          {
            id: '2',
            filename: 'certificate.pdf',
            submittedOn: null,
          },
        ],
      },
    ]);
  });

  it('extracts documents from ccd snake_case allDocuments payload shape', () => {
    const folders = extractViewDocumentFolders({
      allDocuments: [
        {
          id: '1',
          value: {
            document_filename: 'rent-statement-mock.pdf',
            document_binary_url: 'http://dm-store/documents/111/binary',
            category_id: 'propertyDocuments',
          },
        },
        {
          id: '2',
          value: {
            document_filename: 'tenancy-agreement-mock.pdf',
            document_binary_url: 'http://dm-store/documents/222/binary',
            category_id: 'propertyDocuments',
          },
        },
      ],
    });

    expect(folders).toEqual([
      {
        title: 'Property documents',
        documents: [
          {
            id: '1',
            filename: 'rent-statement-mock.pdf',
            submittedOn: null,
          },
          {
            id: '2',
            filename: 'tenancy-agreement-mock.pdf',
            submittedOn: null,
          },
        ],
      },
    ]);
  });

  it('extracts documents with upload_timestamp', () => {
    const folders = extractViewDocumentFolders({
      allDocuments: [
        {
          id: '1',
          value: {
            document_filename: 'certificate.pdf',
            document_binary_url: 'http://doc-store/certificate/binary',
            category_id: 'correspondence',
            upload_timestamp: '2026-06-24T10:00:00.000Z',
          },
        },
      ],
    });

    expect(folders).toEqual([
      {
        title: 'Correspondence',
        documents: [
          {
            id: '1',
            filename: 'certificate.pdf',
            submittedOn: '2026-06-24T10:00:00.000Z',
          },
        ],
      },
    ]);
  });

  it('formats case references with spaces', () => {
    expect(formatCaseReferenceForDisplay('1777570813792018')).toBe('1777 5708 1379 2018');
  });
});
