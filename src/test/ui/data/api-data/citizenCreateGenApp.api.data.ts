const randomString = (length: number): string =>
  Math.random()
    .toString(36)
    .substring(2, 2 + length);

type ApplicationType = 'ADJOURN' | 'SET_ASIDE' | 'SOMETHING_ELSE';

type YesNo = 'YES' | 'NO';

export const citizenCreateGenAppApiData = (applicationType: ApplicationType = 'ADJOURN') => {
  const withoutNotice: YesNo = applicationType === 'SOMETHING_ELSE' ? 'NO' : 'YES';

  return {
    citizenCreateGenAppEventName: 'makeAnApplication',

    citizenCreateGenAppPayload: {
      citizenGenAppRequest: {
        applicationType,

        ...(applicationType === 'ADJOURN' && {
          within14Days: 'YES',
        }),

        needHwf: 'YES',
        appliedForHwf: 'YES',
        hwfReference: 'HWF-123-456',
        otherPartiesAgreed: 'NO',

        withoutNotice,

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
};
