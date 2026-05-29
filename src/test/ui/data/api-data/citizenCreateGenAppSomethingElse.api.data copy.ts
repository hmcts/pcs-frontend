const randomString = (length: number): string =>
  Math.random()
    .toString(36)
    .substring(2, 2 + length);

export const citizenCreateGenAppApiDataSomethingElse = {
  citizenCreateGenAppEventName: 'makeAnApplication',
  citizenCreateGenAppPayload: {
    citizenGenAppRequest: {
      applicationType: 'SOMETHING_ELSE',
      needHwf: 'YES',
      appliedForHwf: 'YES',
      hwfReference: 'HWF-123-456',
      otherPartiesAgreed: 'NO',
      withoutNotice: 'NO',
      withoutNoticeReason: 'This is the reason for not sharing with the other parties.',
      languageUsed: 'ENGLISH',
      whatOrderWanted: 'This is the order that is wanted.',
      sotAccepted: 'YES',
      sotFullName: 'Thomas Tester',
      hasSupportingDocuments: 'YES',
      clientReference: randomString(8),
    },
  },
  citizenCreateGenAppApiEndPoint: (): string => `/cases/${process.env.CASE_NUMBER}/events`,
};
