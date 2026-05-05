import { formatCaseReferenceForDisplay } from '@utils/caseReference';
import { extractViewDocumentFolders, formatSubmittedOn } from '@utils/documentUtils';

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
            href: 'http://doc-store/claim-form/binary',
            submittedOn: 'Submitted on 24 June 2026',
          },
        ],
      },
      {
        title: 'Evidence',
        documents: [
          {
            id: '3',
            filename: 'rent-statement.pdf',
            href: 'http://doc-store/rent-statement',
            submittedOn: 'Submitted on 25 June 2026',
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
            href: 'http://doc-store/rent-statement/binary',
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
            href: 'http://doc-store/notice/binary',
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
            href: 'http://doc-store/certificate/binary',
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
            href: 'http://dm-store/documents/111/binary',
            submittedOn: null,
          },
          {
            id: '2',
            filename: 'tenancy-agreement-mock.pdf',
            href: 'http://dm-store/documents/222/binary',
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
            href: 'http://doc-store/certificate/binary',
            submittedOn: 'Submitted on 24 June 2026',
          },
        ],
      },
    ]);
  });

  it('formats submitted dates for display', () => {
    expect(formatSubmittedOn('2026-06-24')).toBe('Submitted on 24 June 2026');
    expect(formatSubmittedOn('2026-05-01T23:12:01.361668')).toBe('Submitted on 1 May 2026');
    expect(formatSubmittedOn('not-a-date')).toBeNull();
  });

  it('formats case references with spaces', () => {
    expect(formatCaseReferenceForDisplay('1777570813792018')).toBe('1777 5708 1379 2018');
  });
});
