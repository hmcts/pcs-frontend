export const createCaseApiWalesData = {
  createCaseEventName: 'createPossessionClaim',
  createCasePayload: {
    feeAmount: '£404',
    propertyAddress: {
      AddressLine1: '2 Pentre Street',
      AddressLine2: '',
      AddressLine3: '',
      PostTown: 'Caerdydd',
      County: '',
      PostCode: 'CF11 6QX',
      Country: 'Deyrnas Unedig',
    },
    legislativeCountry: 'Wales',
  },
  createCaseApiEndPoint: `/case-types/${process.env.CASE_TYPE_ID ?? 'PCS'}/cases`,
};
