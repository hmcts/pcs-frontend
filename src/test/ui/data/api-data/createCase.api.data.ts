export const createCaseApiData = {
  createCaseEventName: 'createPossessionClaim',
  createCasePayload: {
    feeAmount: '£404',
    propertyAddress: {
      AddressLine1: '2 Second Avenue',
      AddressLine2: '',
      AddressLine3: '',
      PostTown: 'London',
      County: '',
      PostCode: 'W3 7RX',
      Country: 'United Kingdom',
    },
    legislativeCountry: 'England',
  },
  createCaseApiEndPoint: `/case-types/${process.env.CASE_TYPE_ID ?? 'PCS'}/cases`,
};
