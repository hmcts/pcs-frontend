export const submitPossessionClaimResponseApiDataForLR = {
  submitPossessionClaimResponseApiInstance: () => ({
    baseURL: process.env.DATA_STORE_URL_BASE,
    headers: {
      Authorization: `Bearer ${process.env.SOLICITOR_ACCESS_TOKEN}`,
      ServiceAuthorization: `Bearer ${process.env.SERVICE_AUTH_TOKEN}`,
      'Content-Type': 'application/json',
      experimental: 'experimental',
      Accept: '*/*',
    },
  }),

  submitPossessionClaimResponseApiEndPoint: (): string => `/cases/${process.env.CASE_NUMBER}/events`,

  submitPossessionClaimResponsePayload: (RESPONDCLAIM_EVENT_TOKEN: any) => {
    const defendantId = process.env.Defendant_ID;

    return {
      data: {
        currentRepresentedPartyId: defendantId,
        possessionClaimResponse: {
          defendantResponses: {
            dateOfBirth: '1974-02-28',
          },
          claimantOrganisations: [{}],
          defendantContactDetails: {
            party: {},
          },
        },
      },
      event: {
        id: 'respondPossessionClaim',
        summary: 'Submit',
        description: 'Final submit',
      },
      event_token: RESPONDCLAIM_EVENT_TOKEN,
      ignore_warning: false,
    };
  },
};
