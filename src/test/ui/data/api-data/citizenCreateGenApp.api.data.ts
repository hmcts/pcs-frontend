const randomString = (length: number): string =>
  Math.random()
    .toString(36)
    .substring(2, 2 + length);

export const citizenCreateGenAppApiData = {
  citizenCreateGenAppEventName: 'citizenCreateGenApp',
  citizenCreateGenAppPayload: {
    citizenGenAppRequest: {
      applicationType: 'ADJOURN',
      within14Days: 'YES',
      needHwf: 'YES',
      appliedForHwf: 'YES',
      hwfReference: 'HWF-123-456',
      otherPartiesAgreed: 'NO',
      withoutNotice: 'YES',
      withoutNoticeReason: 'This is the reason for not sharing with the other parties.',
      languageUsed: 'ENGLISH',
      whatOrderWanted: 'This is the order that is wanted.',
      sotAccepted: 'YES',
      sotFullName: 'Thomas Tester',
      hasSupportingDocuments: 'YES',
      uploadedDocuments: [
        {
          value: {
            document: {
              document_url:
                'http://dm-store-aat.service.core-compute-aat.internal/documents/45ee6086-9166-4104-9bb2-8efd78d089e7',
              document_filename: 'rent_statement2.txt',
              document_binary_url:
                'http://dm-store-aat.service.core-compute-aat.internal/documents/45ee6086-9166-4104-9bb2-8efd78d089e7/binary',
            },
            contentType: 'some content type',
            size: 10000,
          },
        },
      ],
      clientReference: randomString(8),
    },
  },
  citizenCreateGenAppApiEndPoint: (): string => `/cases/${process.env.CASE_NUMBER}/events`,
};
