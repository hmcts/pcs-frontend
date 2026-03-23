export const submitCaseApiDataWales = {
  submitCaseEventName: 'resumePossessionClaim',

  submitCasePayload: {
    legislativeCountry: 'Wales',

    claimantType: {
      value: {
        code: 'COMMUNITY_LANDLORD',
        label: 'Community landlord',
      },
      list_items: [
        { code: 'PRIVATE_LANDLORD', label: 'Private landlord' },
        { code: 'COMMUNITY_LANDLORD', label: 'Community landlord' },
        { code: 'MORTGAGE_LENDER', label: 'Mortgage lender' },
        { code: 'OTHER', label: 'Other' },
      ],
      valueCode: 'COMMUNITY_LANDLORD',
    },

    claimAgainstTrespassers: 'NO',

    claimantName: 'Possession Claims Solicitor Org',
    isClaimantNameCorrect: 'YES',
    claimantNamePossessiveForm: "Possession Claims Solicitor Org's",

    claimantContactEmail: 'pcs-solicitor1@test.com',
    isCorrectClaimantContactEmail: 'YES',

    orgNameFound: 'Yes',
    orgAddressFound: 'Yes',

    organisationAddress: {
      AddressLine1: 'Ministry Of Justice',
      AddressLine2: 'Seventh Floor 102 Petty France',
      PostTown: 'London',
      PostCode: 'SW1H 9AJ',
      Country: 'United Kingdom',
    },

    formattedClaimantContactAddress: 'Ministry Of Justice<br>Seventh Floor 102 Petty France<br>London<br>SW1H 9AJ',

    isCorrectClaimantContactAddress: 'YES',
    claimantProvidePhoneNumber: 'NO',

    propertyAddress: {
      AddressLine1: '2 Pentre Street',
      AddressLine2: '',
      AddressLine3: '',
      PostTown: 'Caerdydd',
      County: '',
      PostCode: 'CF11 6QX',
      Country: 'Deyrnas Unedig',
    },

    defendant1: {
      nameKnown: 'NO',
      addressKnown: 'NO',
    },

    addAnotherDefendant: 'NO',

    //  CORRECTED: Wales requires SECURE_CONTRACT, not SECURE
    // SECURE = England (SECURE_TENANCY)
    // SECURE_CONTRACT = Wales (section 8 Housing (Wales) Act 2014)
    occupationLicenceTypeWales: 'SECURE_CONTRACT',

    licenceStartDate: '1990-11-10',
    licenceDocuments: [],

    walesLicensed: 'NO',
    walesLicensedAgentAppointed: 'NO',
    walesRegistered: 'NO',

    showRentArrearsPage: 'Yes',
    showReasonsForGroundsPageWales: 'Yes',

    rentDetails_Frequency: 'WEEKLY',
    rentSectionPaymentFrequency: 'WEEKLY',
    rentDetails_CurrentRent: '80000',
    rentDetails_CalculatedDailyCharge: '11429',
    rentDetails_FormattedCalculatedDailyCharge: '£114.29',
    rentDetails_PerDayCorrect: 'YES',

    rentArrears_Total: '8000',
    rentArrears_ThirdPartyPayments: 'YES',
    rentArrears_ThirdPartyPaymentSources: ['UNIVERSAL_CREDIT'],
    arrearsJudgmentWanted: 'YES',

    rentArrears_StatementDocuments: [
      {
        value: {
          document_url:
            'http://dm-store-aat.service.core-compute-aat.internal/documents/69a31b98-9de1-49ae-a79c-97d8c521d0f5',
          document_filename: 'rentArrears.png',
          document_binary_url:
            'http://dm-store-aat.service.core-compute-aat.internal/documents/69a31b98-9de1-49ae-a79c-97d8c521d0f5/binary',
        },
        id: 'be255526-1c87-46be-8107-7643ec2a9112',
      },
    ],

    secureGroundsWales_MandatoryGrounds: ['LANDLORD_NOTICE_S199'],
    walesSecureLandlordNoticeSection199Reason: 'test',
    secureGroundsWales_DiscretionaryGrounds: ['RENT_ARREARS_S157'],

    prohibitedConductWalesClaim: 'NO',

    walesNoticeServed: 'Yes',
    walesTypeOfNoticeServed: 'terts',
    notice_NoticeServiceMethod: 'FIRST_CLASS_POST',
    notice_NoticePostedDate: '1995-11-10',
    notice_NoticeDocuments: [],

    preActionProtocolCompleted: 'YES',
    mediationAttempted: 'NO',
    settlementAttempted: 'NO',

    hasUnderlesseeOrMortgagee: 'YES',
    underlesseeOrMortgagee1: {
      nameKnown: 'NO',
      addressKnown: 'NO',
    },
    addAdditionalUnderlesseeOrMortgagee: 'NO',

    claimantCircumstancesSelect: 'NO',
    hasDefendantCircumstancesInfo: 'NO',

    //  CORRECTED: Disable payments to avoid 422 error
    // If you need payments, add: paymentResponsibleParty, paymentAccountReference, etc.
    claimingCostsWanted: 'NO',
    applicationWithClaim: 'NO',

    additionalReasonsForPossession: {
      hasReasons: 'NO',
    },

    wantToUploadDocuments: 'NO',
    allDocuments: [],

    languageUsed: 'ENGLISH',

    completionNextStep: 'SUBMIT_AND_PAY_NOW',

    statementOfTruth: {
      completedBy: 'CLAIMANT',
      fullNameClaimant: 'sf',
      positionClaimant: 'dsf',
      agreementClaimant: ['BELIEVE_TRUE'],
    },
  },

  submitCaseApiEndPoint: (): string => `/cases/${process.env.CASE_NUMBER}/events`,
};
