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
  createCaseApiEndPoint: `/case-types/PCS${
    process.env.PCS_API_CHANGE_ID ? '-' + process.env.PCS_API_CHANGE_ID : ''
  }/cases`,
};
