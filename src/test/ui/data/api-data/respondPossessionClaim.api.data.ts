export const respondPossessionClaimApiData = {
  respondPossessionClaimEventName: 'respondPossessionClaim',
  respondPossessionClaimPayload: {
    possessionClaimResponse: {
      defendantResponses: {
        receivedFreeLegalAdvice: 'YES',
      },
    },
  },
  respondPossessionClaimApiEndPoint: (): string => `/cases/${process.env.CASE_NUMBER}/events`,
};
