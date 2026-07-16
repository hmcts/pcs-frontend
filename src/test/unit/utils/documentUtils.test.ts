import { formatCaseReferenceForDisplay } from '@utils/caseReference';
import { extractCaseDocuments, extractViewDocumentFolders, findCaseDocumentById } from '@utils/documentUtils';

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

  it('extracts direct links from allDocuments only', () => {
    const documents = extractCaseDocuments({
      allDocuments: [
        {
          id: '11111111-1111-1111-1111-111111111111',
          value: {
            document_binary_url: 'http://doc-store/rent-statement/binary',
            document_filename: 'rent-statement.pdf',
            document_type: 'RENT_STATEMENT',
          },
        },
        {
          id: '22222222-2222-2222-2222-222222222222',
          value: {
            document_binary_url: 'http://doc-store/notice/binary',
            document_filename: 'notice.pdf',
            document_type: 'NOTICE',
          },
        },
      ],
    });

    expect(documents).toEqual([
      {
        id: '11111111-1111-1111-1111-111111111111',
        filename: 'rent-statement.pdf',
        binaryUrl: 'http://doc-store/rent-statement/binary',
        categoryId: undefined,
        documentType: 'RENT_STATEMENT',
        sourceField: 'allDocuments',
      },
      {
        id: '22222222-2222-2222-2222-222222222222',
        filename: 'notice.pdf',
        binaryUrl: 'http://doc-store/notice/binary',
        categoryId: undefined,
        documentType: 'NOTICE',
        sourceField: 'allDocuments',
      },
    ]);
  });

  it('extracts tenancy licence documents from detailsTab_TenancyLicenceDetails.tenancyLicenceDocuments for submitted cases', () => {
    const documents = extractCaseDocuments({
      detailsTab_TenancyLicenceDetails: {
        tenancyLicenceDocuments: [
          {
            id: '44444444-4444-4444-4444-444444444444',
            value: {
              document_binary_url: 'http://doc-store/submitted-tenancy/binary',
              document_filename: 'tenancy-agreement.pdf',
              document_type: 'TENANCY_LICENCE_DOCUMENT',
            },
          },
        ],
      },
    });

    expect(documents).toEqual([
      {
        id: '44444444-4444-4444-4444-444444444444',
        filename: 'tenancy-agreement.pdf',
        binaryUrl: 'http://doc-store/submitted-tenancy/binary',
        categoryId: undefined,
        documentType: 'TENANCY_LICENCE_DOCUMENT',
        sourceField: 'detailsTab_TenancyLicenceDetails.tenancyLicenceDocuments',
      },
    ]);
  });

  it('extracts rent statement documents from detailsTab_RentArrearsDetails.rentStatement for submitted cases', () => {
    const documents = extractCaseDocuments({
      detailsTab_RentArrearsDetails: {
        rentStatement: [
          {
            id: '55555555-5555-5555-5555-555555555555',
            value: {
              document_binary_url: 'http://doc-store/submitted-rent-statement/binary',
              document_filename: 'rent-statement.pdf',
              document_type: 'RENT_STATEMENT',
            },
          },
        ],
      },
    });

    expect(documents).toEqual([
      {
        id: '55555555-5555-5555-5555-555555555555',
        filename: 'rent-statement.pdf',
        binaryUrl: 'http://doc-store/submitted-rent-statement/binary',
        categoryId: undefined,
        documentType: 'RENT_STATEMENT',
        sourceField: 'detailsTab_RentArrearsDetails.rentStatement',
      },
    ]);
  });

  it('extracts occupation contract licence documents from detailsTab_OccupationContractLicenceDetails.documents for submitted cases', () => {
    const documents = extractCaseDocuments({
      detailsTab_OccupationContractLicenceDetails: {
        documents: [
          {
            id: '66666666-6666-6666-6666-666666666666',
            value: {
              document_binary_url: 'http://doc-store/submitted-occupation-contract/binary',
              document_filename: 'occupation-contract.pdf',
              document_type: 'OCCUPATION_CONTRACT_LICENCE_DOCUMENT',
            },
          },
        ],
      },
    });

    expect(documents).toEqual([
      {
        id: '66666666-6666-6666-6666-666666666666',
        filename: 'occupation-contract.pdf',
        binaryUrl: 'http://doc-store/submitted-occupation-contract/binary',
        categoryId: undefined,
        documentType: 'OCCUPATION_CONTRACT_LICENCE_DOCUMENT',
        sourceField: 'detailsTab_OccupationContractLicenceDetails.documents',
      },
    ]);
  });

  it('finds documents from allDocuments by id', () => {
    const document = findCaseDocumentById(
      {
        allDocuments: [
          {
            id: '33333333-3333-3333-3333-333333333333',
            value: {
              document_binary_url: 'http://doc-store/notice/binary',
              document_filename: 'notice.pdf',
              document_type: 'NOTICE',
            },
          },
        ],
      },
      '33333333-3333-3333-3333-333333333333'
    );

    expect(document).toEqual(
      expect.objectContaining({
        filename: 'notice.pdf',
        binaryUrl: 'http://doc-store/notice/binary',
      })
    );
  });
});
