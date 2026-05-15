// MID EVENT CALLBACK
export const respondPossessionClaimMidEventApiData = {
    respondPossessionClaimEventName: 'respondPossessionClaim',

    respondPossessionClaimPayload: {

        possessionClaimResponse: {

            defendantResponses: {
                receivedFreeLegalAdvice: 'NO'
            },
            defendantContactDetails: {
                party: {
                    firstName: 'Jackie',
                    lastName: 'Snow',
                    orgName: 'Credit Ltd',
                    //'nameKnown: 'YES'
                    emailAddress: 'Jackie.Snow@example.com',
                    address: {
                        AddressLine1: '39 Yellow Street',
                        AddressLine2: 'House 2',
                        AddressLine3: null,
                        PostTown: 'Newcastle',
                        County: 'Cumbria',
                        Country: 'England',
                        PostCode: 'NW1 3BP'
                    },
                    //'addressKnown:'YES'
                    //'addressSameAsProperty: 'NO'
                    phoneNumber: '01234567890',
                    phoneNumberProvided: 'YES'
                }
            }

        },

        },

    respondPossessionClaimApiEndPoint: (): string =>
        `/callbacks/mid-event?page=respondToPossessionDraftSavePage`,
};