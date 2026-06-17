export const respondPossessionClaimMidEventApiData = {
  respondPossessionClaimEventName: 'respondPossessionClaim',
  respondPossessionClaimPayload: {
    event_data: {
      possessionClaimResponse: {
        defendantContactDetails: {
          party: {
            firstName: 'Test',
            lastName: 'Defendant',
            //'emailAddress: '{{Citizen_EmailID}}',
            phoneNumber: '07700900000',
            phoneNumberProvided: 'YES',
            address: {
              AddressLine1: '10 Second Avenue',
              AddressLine2: '',
              AddressLine3: '',
              PostTown: 'London',
              County: '',
              Country: 'United Kingdom',
              PostCode: 'W3 7RX'
            }
          }
        },
        defendantResponses: {
          defendantNameConfirmation: 'YES',
          correspondenceAddressConfirmation: 'YES',
          dateOfBirth: '1990-05-20',
          contactByPhone: 'YES',
          contactByText: 'NO',
          contactByEmail: 'YES',
          contactByPost: 'NO',
          freeLegalAdvice: 'NO',
          tenancyTypeConfirmation: 'YES',
          tenancyType: 'Assured shorthold tenancy',
          tenancyStartDateConfirmation: 'YES',
          tenancyStartDate: '2020-01-15',
          rentArrearsAmountConfirmation: 'YES',
          rentArrearsAmount: '50000',
          possessionNoticeReceived: 'YES',
          noticeReceivedDate: '2026-03-10',
          landlordRegistered: 'YES',
          landlordLicensed: 'YES',
          writtenTerms: 'YES',
          disputeClaim: 'NO',
          disputeClaimDetails: '',
          makeCounterClaim: 'YES',
          counterClaim: {
            claimType: 'PAYMENT_OR_COMPENSATION',
            isClaimAmountKnown: 'YES',
            claimAmount: '150000',
            estimatedMaxClaimAmount: '200000',
            needHelpWithFees: 'NO',
            counterClaimFor: 'Deposit not returned after tenancy ended',
            counterClaimReasons: 'Landlord withheld deposit without valid reason'
          },
          paymentAgreement: {
            anyPaymentsMade: 'YES',
            paymentDetails: 'Paid £200 on 1 March 2026 by bank transfer.',
            repaymentPlanAgreed: 'YES',
            repaymentAgreedDetails: 'Agreed to pay £50 per week until arrears cleared.',
            repayArrearsInstalments: 'YES',
            additionalRentContribution: '5000',
            additionalContributionFrequency: 'WEEKLY'
          },
          householdCircumstances: {
            shareAdditionalCircumstances: 'YES',
            additionalCircumstancesDetails: 'Recent job loss affecting ability to pay rent.',
            exceptionalHardship: 'YES',
            exceptionalHardshipDetails: 'Two young children in the household.',
            dependantChildren: 'YES',
            dependantChildrenDetails: 'Children aged 4 and 7.',
            otherDependants: 'NO',
            otherDependantDetails: '',
            alternativeAccommodation: 'NOT_SURE',
            alternativeAccommodationTransferDate: '2026-06-01',
            otherTenants: 'YES',
            otherTenantsDetails: 'Partner is also named on the tenancy agreement.',
            incomeFromJobs: 'YES',
            incomeFromJobsAmount: '180000',
            incomeFromJobsFrequency: 'MONTHLY',
            pension: 'NO',
            universalCredit: 'YES',
            universalCreditAmount: '40000',
            universalCreditFrequency: 'MONTHLY',
            hasAppliedForUniversalCredit: 'NO',
            otherBenefits: 'YES',
            otherBenefitsAmount: '12000',
            otherBenefitsFrequency: 'MONTHLY',
            moneyFromElsewhere: 'NO',
            moneyFromElsewhereDetails: '',
            priorityDebts: 'YES',
            debtTotal: '300000',
            debtContribution: '7500',
            debtContributionFrequency: 'MONTHLY',
            householdBills: { applies: 'YES', amount: '45000', frequency: 'MONTHLY' },
            loanPayments: { applies: 'YES', amount: '15000', frequency: 'MONTHLY' },
            childSpousalMaintenance: { applies: 'NO' },
            mobilePhone: { applies: 'YES', amount: '3500', frequency: 'MONTHLY' },
            groceryShopping: { applies: 'YES', amount: '28000', frequency: 'MONTHLY' },
            fuelParkingTransport: { applies: 'YES', amount: '9000', frequency: 'MONTHLY' },
            schoolCosts: { applies: 'YES', amount: '6000', frequency: 'MONTHLY' },
            clothing: { applies: 'YES', amount: '4000', frequency: 'MONTHLY' },
            otherExpenses: { applies: 'YES', amount: '2500', frequency: 'MONTHLY' }
          },
          otherConsiderations: 'YES',
          otherConsiderationsDetails: 'I have been in contact with the council housing team.',
          languageUsed: 'ENGLISH',
          statementOfTruthCompletedBy: 'DEFENDANT'
        }
      }
    },

  },

  respondPossessionClaimApiEndPoint: (): string => `/case-types/PCS/validate?pageId=respondPossessionClaimrespondToPossessionDraftSavePage`,
};
