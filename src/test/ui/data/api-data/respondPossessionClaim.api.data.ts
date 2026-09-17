export const respondPossessionClaimApiData = {
  respondPossessionClaimEventName: 'respondPossessionClaim',
  respondPossessionClaimPayload: {
    possessionClaimResponse: {
      defendantResponses: {
        freeLegalAdvice: 'YES',
      },
    },
  },
  respondPossessionClaimApiEndPoint: (): string => `/cases/${process.env.CASE_NUMBER}/events`,
};
