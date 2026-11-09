export const respondPossessionClaimApiData = {
  respondPossessionClaimEventName: 'respondPossessionClaim',
  respondPossessionClaimPayload: {
    submitDraftAnswers: 'YES',
    possessionClaimResponse: {
      defendantResponses: {
        freeLegalAdvice: 'YES',
      },
    },
  },
  respondPossessionClaimApiEndPoint: (): string => `/cases/${process.env.CASE_NUMBER}/events`,
};
