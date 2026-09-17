export const respondPossessionClaimApiData = {
  respondPossessionClaimEventName: 'respondPossessionClaim',
  respondPossessionClaimPayload: {
    submitDraftAnswers: 'YES',
    possessionClaimResponse: {
      defendantResponses: {
        receivedFreeLegalAdvice: 'YES',
      },
    },
  },
  respondPossessionClaimApiEndPoint: (): string => `/cases/${process.env.CASE_NUMBER}/events`,
};
