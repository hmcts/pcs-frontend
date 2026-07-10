import type { Application, NextFunction, Request, RequestHandler, Response } from 'express';

import { VIEW_RESPONSE_ROUTE } from '../../../main/constants/caseRoutes';
import { oidcMiddleware } from '../../../main/middleware';

import viewTheResponseRoute from '@routes/viewTheResponse';
import type { CcdCaseData, CcdDefendantResponses } from '@services/ccdCase.interface';
import { ccdCaseService } from '@services/ccdCaseService';

jest.mock('../../../main/middleware', () => ({
  oidcMiddleware: jest.fn((req, res, next) => next()),
}));

const translationStrings: Record<string, string> = {
  'common:options.yes': 'Yes',
  'common:options.no': 'No',
  'common:options.imNotSure': "I'm not sure",
  'viewTheResponse:frequency.weekly': 'Weekly',
  'viewTheResponse:frequency.monthly': 'Monthly',
  'viewTheResponse:incomeFrequencies.WEEKLY': 'received every week',
  'viewTheResponse:incomeFrequencies.MONTHLY': 'received every month',
  'viewTheResponse:paymentFrequencies.WEEKLY': 'paid every week',
  'viewTheResponse:paymentFrequencies.MONTHLY': 'paid every month',
  'viewTheResponse:defendant.freeLegalAdviceOptions.YES': 'Yes',
  'viewTheResponse:defendant.freeLegalAdviceOptions.NO': 'No',
  'viewTheResponse:defendant.freeLegalAdviceOptions.PREFER_NOT_TO_SAY': 'Prefer not to say',
  'viewTheResponse:counterclaim.claimTypeOptions.PAYMENT_OR_COMPENSATION': 'A sum of money or compensation',
  'viewTheResponse:counterclaim.claimTypeOptions.SOMETHING_ELSE': 'Something else',
  'viewTheResponse:counterclaim.claimTypeOptions.BOTH': 'Both',
  'viewTheResponse:counterclaim.needHelpWithFeesOptions.NO': 'I do not need help paying the fee',
  'viewTheResponse:personsUnknown': 'Persons unknown',
  'viewTheResponse:addressUnknown': 'Address unknown',
};

jest.mock('@modules/i18n', () => ({
  getTranslationFunction: jest.fn(
    () => ((key: string) => translationStrings[key] ?? key) as import('i18next').TFunction
  ),
}));

jest.mock('@services/ccdCaseService', () => ({
  ccdCaseService: {
    getCaseById: jest.fn(),
  },
}));

function buildComprehensiveCaseData(): CcdCaseData {
  return {
    claimantName: 'Example Claimant Ltd',
    propertyAddress: {
      AddressLine1: '10 Second Avenue',
      PostTown: 'London',
      PostCode: 'W3 7RX',
    },
    claimGroundSummaries: [
      {
        id: 'ground-1',
        value: {
          category: 'rent',
          code: 'G1',
          label: 'Rent arrears',
          isRentArrears: 'Yes',
        },
      },
    ],
    isExemptLandlord: 'YES',
    dateSubmitted: '2026-02-01',
    allDefendants: [
      { id: 'def-1', value: { firstName: 'Jane', lastName: 'Defendant' } },
      {
        id: 'def-2',
        value: {
          nameKnown: 'YES',
          firstName: 'Peter',
          lastName: 'Parker',
          addressKnown: 'YES',
          addressSameAsProperty: 'YES',
          dateOfBirth: '1985-07-20',
        },
      },
    ] as CcdCaseData['allDefendants'],
    possessionClaimResponse: {
      currentDefendantPartyId: 'def-1',
      claimIssuedDate: '2026-02-05',
      claimantServiceAddress: {
        AddressLine1: '1 Claimant Street',
        PostTown: 'London',
        PostCode: 'E1 1AA',
      },
      defendantContactDetails: {
        party: {
          firstName: 'Jane',
          lastName: 'Defendant',
          emailAddress: 'jane.defendant@example.com',
          phoneNumberProvided: 'YES',
          phoneNumber: '07700900000',
          address: {
            AddressLine1: '2 Defendant Road',
            PostTown: 'London',
            PostCode: 'N1 1AA',
          },
        },
      },
      defendantResponses: {
        statementOfTruthCompletedBy: 'Jane Defendant',
        contactByText: 'YES',
        contactByPhone: 'YES',
        contactByEmail: 'YES',
        contactByPost: 'YES',
        freeLegalAdvice: 'YES',
        dateOfBirth: '1990-05-15',
        disputeClaim: 'YES',
        disputeClaimDetails: 'I dispute the amount claimed',
        tenancyTypeConfirmation: 'NOT_SURE',
        tenancyType: 'Assured shorthold',
        tenancyStartDateConfirmation: 'YES',
        tenancyStartDate: '2018-03-01',
        possessionNoticeReceived: 'NO',
        noticeReceivedDate: '2025-12-01',
        rentArrearsAmountConfirmation: 'YES',
        rentArrearsAmount: '125000',
        landlordRegistered: 'YES',
        landlordLicensed: 'NO',
        writtenTerms: 'NOT_SURE',
        paymentAgreement: {
          anyPaymentsMade: 'YES',
          paymentDetails: 'Paid £500 in January',
          repaymentPlanAgreed: 'NOT_SURE',
          repaymentAgreedDetails: 'Verbal agreement',
          repayArrearsInstalments: 'YES',
          additionalRentContribution: '5000',
          additionalContributionFrequency: 'WEEKLY',
        },
        householdCircumstances: {
          shareAdditionalCircumstances: 'YES',
          additionalCircumstancesDetails: 'Health issues',
          exceptionalHardship: 'NO',
          exceptionalHardshipDetails: 'N/A',
          dependantChildren: 'YES',
          dependantChildrenDetails: 'Two children',
          otherDependants: 'NO',
          otherDependantDetails: '',
          alternativeAccommodation: 'NOT_SURE',
          alternativeAccommodationTransferDate: '2026-06-01',
          otherTenants: 'YES',
          otherTenantsDetails: 'One lodger',
          incomeFromJobs: 'YES',
          incomeFromJobsAmount: '250000',
          incomeFromJobsFrequency: 'MONTHLY',
          pension: 'NO',
          universalCredit: 'YES',
          universalCreditAmount: '10000',
          universalCreditFrequency: 'MONTHLY',
          otherBenefits: 'YES',
          otherBenefitsAmount: '5000',
          otherBenefitsFrequency: 'WEEKLY',
          moneyFromElsewhere: 'YES',
          moneyFromElsewhereDetails: 'Family support',
          priorityDebts: 'YES',
          debtTotal: '300000',
          debtContribution: '15000',
          debtContributionFrequency: 'MONTHLY',
          householdBills: { applies: 'YES', amount: '12000', frequency: 'MONTHLY' },
          loanPayments: { applies: 'NO' },
          childSpousalMaintenance: { applies: 'YES', amount: '8000', frequency: 'WEEKLY' },
          mobilePhone: { applies: 'YES', amount: '3000', frequency: 'MONTHLY' },
          groceryShopping: { applies: 'YES', amount: '20000', frequency: 'WEEKLY' },
          fuelParkingTransport: { applies: 'YES', amount: '4000', frequency: 'MONTHLY' },
          schoolCosts: { applies: 'NO' },
          clothing: { applies: 'YES', amount: '2000', frequency: 'MONTHLY' },
          otherExpenses: { applies: 'YES', amount: '1000', frequency: 'WEEKLY' },
        },
        otherConsiderations: 'YES',
        otherConsiderationsDetails: 'Awaiting housing benefit',
        makeCounterClaim: 'YES',
        counterClaim: {
          claimType: 'PAYMENT_OR_COMPENSATION',
          isClaimAmountKnown: 'YES',
          claimAmount: '500000',
          estimatedMaxClaimAmount: '750000',
          counterClaimAgainst: [{ id: 'claimant-1', value: { orgName: 'Example Claimant Ltd' } }],
          counterClaimFor: 'Unpaid repair costs',
          counterClaimReasons: 'The landlord did not carry out agreed repairs',
          otherOrderRequestDetails: 'Order the claimant to pay compensation',
          otherOrderRequestFacts: 'Repair invoices were sent on 1 January 2026',
          needHelpWithFees: 'NO',
        },
      },
    },
  };
}

function buildAlternateBranchesCaseData(): CcdCaseData {
  return {
    dateSubmitted: 'also-invalid',
    possessionClaimResponse: {
      claimIssuedDate: 'not-a-valid-date',
      defendantContactDetails: {
        party: {
          firstName: 'Alex',
          lastName: 'Smith',
          phoneNumberProvided: 'NO',
          address: {},
        },
      },
      defendantResponses: {
        tenancyStartDate: 'bad-date-value',
        disputeClaim: 'NO',
        tenancyTypeConfirmation: 'NO',
        possessionNoticeReceived: 'NOT_SURE',
        landlordRegistered: undefined,
        householdCircumstances: {
          incomeFromJobs: 'NO',
          universalCredit: 'NO',
          hasAppliedForUniversalCredit: 'YES',
          ucApplicationDate: '2026-01-15',
          pension: 'YES',
          pensionAmount: '10000',
          pensionFrequency: 'MONTHLY',
        },
      },
    },
  };
}

describe('viewTheResponse route', () => {
  let app: Application;

  const caseReference = '1234567890123456';

  function mockCaseById(data: CcdCaseData) {
    (ccdCaseService.getCaseById as jest.Mock).mockResolvedValue({
      id: caseReference,
      data,
    });
  }

  function viewTheResponseRequest(options: {
    caseReference?: string | number;
    sessionUser?: { accessToken?: string };
  }): Request {
    return {
      params: options.caseReference === undefined ? {} : { caseReference: options.caseReference },
      session: { user: options.sessionUser },
    } as unknown as Request;
  }

  function getHandler(): RequestHandler {
    const fn = (app.get as jest.Mock).mock.calls.find(call => call[0] === VIEW_RESPONSE_ROUTE)?.[2];
    if (typeof fn !== 'function') {
      throw new Error('view-the-response handler not registered');
    }
    return fn as RequestHandler;
  }

  beforeEach(() => {
    app = {
      get: jest.fn(),
    } as unknown as Application;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should register GET /case/:caseReference/view-the-response with oidc middleware', () => {
    viewTheResponseRoute(app);

    expect(app.get).toHaveBeenCalledWith(VIEW_RESPONSE_ROUTE, oidcMiddleware, expect.any(Function));
  });

  it('should render the view-the-response template with case data from getCaseById', async () => {
    mockCaseById({
      propertyAddress: {
        AddressLine1: '10 Second Avenue',
        PostTown: 'London',
        PostCode: 'W3 7RX',
      },
      dateSubmitted: '2026-02-01',
      possessionClaimResponse: {
        claimIssuedDate: '2026-02-05',
        defendantResponses: {
          statementOfTruthCompletedBy: 'DEFENDANT',
        },
      },
    });

    viewTheResponseRoute(app);

    const handler = getHandler();
    const res = { render: jest.fn() } as unknown as Response;
    const next: NextFunction = jest.fn();

    await handler(
      viewTheResponseRequest({
        caseReference,
        sessionUser: { accessToken: 'access-token-1' },
      }),
      res,
      next
    );

    expect(ccdCaseService.getCaseById).toHaveBeenCalledWith('access-token-1', caseReference);
    expect(next).not.toHaveBeenCalled();
    expect(res.render).toHaveBeenCalledWith(
      'view-the-response',
      expect.objectContaining({
        caseReferenceDisplay: '1234 5678 9012 3456',
        caseDates: expect.objectContaining({
          rows: expect.arrayContaining([
            expect.objectContaining({
              key: { text: 'viewTheResponse:summary.dateIssued' },
              value: { text: '5 February 2026' },
            }),
            expect.objectContaining({
              key: { text: 'viewTheResponse:summary.dateSubmitted' },
              value: { text: '1 February 2026' },
            }),
          ]),
        }),
        dashboardUrl: `/case/${caseReference}/dashboard`,
        viewDocumentsUrl: `/case/${caseReference}/view-documents`,
      })
    );
  });

  it('should render all summary sections when case data is comprehensive', async () => {
    mockCaseById(buildComprehensiveCaseData());

    viewTheResponseRoute(app);
    const handler = getHandler();
    const res = { render: jest.fn() } as unknown as Response;
    const next: NextFunction = jest.fn();

    await handler(
      viewTheResponseRequest({
        caseReference,
        sessionUser: { accessToken: 'access-token-1' },
      }),
      res,
      next
    );

    expect(next).not.toHaveBeenCalled();
    const renderArgs = (res.render as jest.Mock).mock.calls[0][1];
    expect(renderArgs.claimantDetails.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: { text: 'viewTheResponse:claimantDetails.name' },
          value: { text: 'Example Claimant Ltd' },
        }),
        expect.objectContaining({
          key: { text: 'viewTheResponse:claimantDetails.address' },
          value: { text: '1 Claimant Street, London, E1 1AA' },
        }),
      ])
    );
    expect(renderArgs.defendant1Details.rows.length).toBeGreaterThan(0);
    expect(renderArgs.defendant1Details.rows.map((row: { key: { text: string } }) => row.key.text)).toEqual([
      'viewTheResponse:defendant.name',
      'viewTheResponse:defendant.phone',
      'viewTheResponse:defendant.address',
      'viewTheResponse:defendant.dateOfBirth',
    ]);
    expect(renderArgs.additionalDefendantDetails).toHaveLength(1);
    expect(renderArgs.additionalDefendantDetails[0].rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: { text: 'viewTheResponse:defendant.name' },
          value: { text: 'Peter Parker' },
        }),
        expect.objectContaining({
          key: { text: 'viewTheResponse:defendant.address' },
          value: { text: '10 Second Avenue, London, W3 7RX' },
        }),
        expect.objectContaining({
          key: { text: 'viewTheResponse:defendant.dateOfBirth' },
          value: { text: '20 July 1985' },
        }),
      ])
    );
    expect(renderArgs.responseToClaim.rows.length).toBeGreaterThan(0);
    expect(renderArgs.paymentsOrAgreements.rows.length).toBeGreaterThan(0);
    expect(renderArgs.householdAndCircumstances.rows.length).toBeGreaterThan(0);
    expect(renderArgs.regularIncome.rows.length).toBeGreaterThan(0);
    expect(renderArgs.priorityDebts.rows.length).toBeGreaterThan(0);
    expect(renderArgs.regularExpenses.rows.length).toBeGreaterThan(0);
    expect(renderArgs.additionalInformation.rows.length).toBeGreaterThan(0);
    expect(renderArgs.counterclaim.rows.length).toBeGreaterThan(0);
    expect(renderArgs.responseToClaim.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: { text: 'viewTheResponse:responseToClaim.landlordRegistered' },
          value: { text: 'Yes' },
        }),
        expect.objectContaining({
          key: { text: 'viewTheResponse:responseToClaim.landlordLicensed' },
          value: { text: 'No' },
        }),
        expect.objectContaining({
          key: { text: 'viewTheResponse:responseToClaim.rentArrearsAmountConfirmation' },
          value: { text: 'Yes' },
        }),
        expect.objectContaining({
          key: { text: 'viewTheResponse:responseToClaim.exemptLandlord' },
          value: { text: 'Yes' },
        }),
        expect.objectContaining({
          key: { text: 'viewTheResponse:responseToClaim.makeCounterClaim' },
          value: { text: 'Yes' },
        }),
      ])
    );
    expect(renderArgs.responseToClaim.rows).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: { text: 'viewTheResponse:responseToClaim.rentArrearsAmount' },
        }),
      ])
    );
    expect(renderArgs.regularIncome.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: { text: 'viewTheResponse:income.fromJobs' },
          value: { text: '£2500.00 received every month' },
        }),
      ])
    );
    expect(renderArgs.priorityDebts.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: { text: 'viewTheResponse:debts.debtContribution' },
          value: { text: '£150.00 paid every month' },
        }),
      ])
    );
    expect(renderArgs.regularExpenses.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: { text: 'viewTheResponse:expenses.householdBills' },
          value: { text: '£120.00 paid every month' },
        }),
      ])
    );
    expect(renderArgs.paymentsOrAgreements.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: { text: 'viewTheResponse:payments.additionalContribution' },
          value: { text: '£50.00' },
        }),
        expect.objectContaining({
          key: { text: 'viewTheResponse:payments.additionalContributionFrequency' },
          value: { text: 'Weekly' },
        }),
      ])
    );
    expect(renderArgs.counterclaim.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: { text: 'viewTheResponse:counterclaim.type' },
          value: { text: 'A sum of money or compensation' },
        }),
        expect.objectContaining({
          key: { text: 'viewTheResponse:counterclaim.amountKnown' },
          value: { text: 'Yes' },
        }),
        expect.objectContaining({
          key: { text: 'viewTheResponse:counterclaim.amount' },
          value: { text: '£5000.00' },
        }),
        expect.objectContaining({
          key: { text: 'viewTheResponse:counterclaim.against' },
          value: { text: 'Example Claimant Ltd' },
        }),
        expect.objectContaining({
          key: { text: 'viewTheResponse:counterclaim.for' },
          value: { text: 'Unpaid repair costs' },
        }),
        expect.objectContaining({
          key: { text: 'viewTheResponse:counterclaim.reasons' },
          value: { text: 'The landlord did not carry out agreed repairs' },
        }),
        expect.objectContaining({
          key: { text: 'viewTheResponse:counterclaim.ordersRequested' },
          value: { text: 'Order the claimant to pay compensation' },
        }),
        expect.objectContaining({
          key: { text: 'viewTheResponse:counterclaim.factsForCourt' },
          value: { text: 'Repair invoices were sent on 1 January 2026' },
        }),
        expect.objectContaining({
          key: { text: 'viewTheResponse:counterclaim.needHelpWithFees' },
          value: { text: 'I do not need help paying the fee' },
        }),
      ])
    );
    expect(renderArgs.counterclaim.rows).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: { text: 'viewTheResponse:counterclaim.estimatedMaxAmount' },
        }),
        expect.objectContaining({
          key: { text: 'viewTheResponse:counterclaim.againstName' },
        }),
        expect.objectContaining({
          key: { text: 'viewTheResponse:counterclaim.againstAddress' },
        }),
      ])
    );
  });

  it('should show persons unknown when additional defendant name is redacted with no name fields', async () => {
    mockCaseById({
      propertyAddress: {
        AddressLine1: 'Clapping Gate',
        AddressLine2: 'Knowles Lane',
        PostTown: 'Whitchurch',
        PostCode: 'SY13 2LH',
      },
      possessionClaimResponse: {
        currentDefendantPartyId: 'def-1',
        defendantResponses: { disputeClaim: 'NO' },
      },
      allDefendants: [
        { id: 'def-1', value: { firstName: 'Jane', lastName: 'Defendant' } },
        { id: 'def-2', value: {} },
      ],
    } as CcdCaseData);

    viewTheResponseRoute(app);
    const handler = getHandler();
    const res = { render: jest.fn() } as unknown as Response;
    const next: NextFunction = jest.fn();

    await handler(
      viewTheResponseRequest({
        caseReference,
        sessionUser: { accessToken: 'access-token-1' },
      }),
      res,
      next
    );

    const renderArgs = (res.render as jest.Mock).mock.calls[0][1];
    expect(renderArgs.additionalDefendantDetails[0].rows).toEqual([
      expect.objectContaining({
        key: { text: 'viewTheResponse:defendant.name' },
        value: { text: 'Persons unknown' },
      }),
      expect.objectContaining({
        key: { text: 'viewTheResponse:defendant.address' },
        value: { text: 'Address unknown' },
      }),
    ]);
  });

  it('should show persons unknown for additional defendants when name is not known', async () => {
    mockCaseById({
      possessionClaimResponse: {
        currentDefendantPartyId: 'def-1',
        defendantResponses: { disputeClaim: 'NO' },
      },
      allDefendants: [
        { id: 'def-1', value: { firstName: 'Jane', lastName: 'Defendant' } },
        { id: 'def-2', value: { nameKnown: 'NO', addressKnown: 'NO' } },
      ],
    } as CcdCaseData);

    viewTheResponseRoute(app);
    const handler = getHandler();
    const res = { render: jest.fn() } as unknown as Response;
    const next: NextFunction = jest.fn();

    await handler(
      viewTheResponseRequest({
        caseReference,
        sessionUser: { accessToken: 'access-token-1' },
      }),
      res,
      next
    );

    const renderArgs = (res.render as jest.Mock).mock.calls[0][1];
    expect(renderArgs.additionalDefendantDetails[0].rows).toEqual([
      expect.objectContaining({
        key: { text: 'viewTheResponse:defendant.name' },
        value: { text: 'Persons unknown' },
      }),
      expect.objectContaining({
        key: { text: 'viewTheResponse:defendant.address' },
        value: { text: 'Address unknown' },
      }),
    ]);
  });

  it('should show other co-defendants as additional defendant sections when viewer is not defendant 1 on the claim', async () => {
    mockCaseById({
      possessionClaimResponse: {
        currentDefendantPartyId: 'def-2',
        defendantResponses: { disputeClaim: 'NO' },
      },
      allDefendants: [
        { id: 'def-1', value: { firstName: 'Jane', lastName: 'Defendant' } },
        { id: 'def-2', value: { firstName: 'Peter', lastName: 'Parker' } },
      ],
    } as CcdCaseData);

    viewTheResponseRoute(app);
    const handler = getHandler();
    const res = { render: jest.fn() } as unknown as Response;

    await handler(
      viewTheResponseRequest({
        caseReference,
        sessionUser: { accessToken: 'access-token-1' },
      }),
      res,
      jest.fn()
    );

    const { additionalDefendantDetails } = (res.render as jest.Mock).mock.calls[0][1];
    expect(additionalDefendantDetails).toHaveLength(1);
    expect(additionalDefendantDetails[0].rows).toEqual([
      expect.objectContaining({
        key: { text: 'viewTheResponse:defendant.name' },
        value: { text: 'Jane Defendant' },
      }),
      expect.objectContaining({
        key: { text: 'viewTheResponse:defendant.address' },
        value: { text: 'Address unknown' },
      }),
    ]);
  });

  it('should omit the viewing defendant from additional defendant sections', async () => {
    mockCaseById({
      possessionClaimResponse: {
        currentDefendantPartyId: 'def-1',
        defendantResponses: { disputeClaim: 'NO' },
      },
      allDefendants: [
        { id: 'def-1', value: { firstName: 'Jane', lastName: 'Defendant' } },
        { id: 'def-2', value: { firstName: 'Peter', lastName: 'Parker' } },
      ],
    } as CcdCaseData);

    viewTheResponseRoute(app);
    const handler = getHandler();
    const res = { render: jest.fn() } as unknown as Response;

    await handler(
      viewTheResponseRequest({
        caseReference,
        sessionUser: { accessToken: 'access-token-1' },
      }),
      res,
      jest.fn()
    );

    const { additionalDefendantDetails } = (res.render as jest.Mock).mock.calls[0][1];
    expect(additionalDefendantDetails).toHaveLength(1);
    expect(additionalDefendantDetails[0].rows).toEqual([
      expect.objectContaining({
        key: { text: 'viewTheResponse:defendant.name' },
        value: { text: 'Peter Parker' },
      }),
      expect.objectContaining({
        key: { text: 'viewTheResponse:defendant.address' },
        value: { text: 'Address unknown' },
      }),
    ]);
  });

  it('should map counterclaim rows 3 and 4 exclusively by whether the amount is known', async () => {
    mockCaseById({
      possessionClaimResponse: {
        defendantResponses: {
          makeCounterClaim: 'YES',
          counterClaim: {
            claimType: 'PAYMENT_OR_COMPENSATION',
            isClaimAmountKnown: 'NO',
            estimatedMaxClaimAmount: '750000',
          },
        },
      },
    });

    viewTheResponseRoute(app);
    const handler = getHandler();
    const res = { render: jest.fn() } as unknown as Response;

    await handler(
      viewTheResponseRequest({
        caseReference,
        sessionUser: { accessToken: 'access-token-1' },
      }),
      res,
      jest.fn()
    );

    const { counterclaim } = (res.render as jest.Mock).mock.calls[0][1];
    expect(counterclaim.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: { text: 'viewTheResponse:counterclaim.estimatedMaxAmount' },
          value: { text: '£7500.00' },
        }),
      ])
    );
    expect(counterclaim.rows).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: { text: 'viewTheResponse:counterclaim.amount' },
        }),
      ])
    );
  });

  it('should join multiple counterclaim against parties for row 5', async () => {
    mockCaseById({
      possessionClaimResponse: {
        defendantResponses: {
          makeCounterClaim: 'YES',
          counterClaim: {
            claimType: 'SOMETHING_ELSE',
            counterClaimAgainst: [
              { id: 'c1', value: { orgName: 'Claimant Org' } },
              { id: 'd2', value: { firstName: 'Peter', lastName: 'Parker' } },
            ],
            counterClaimFor: 'An injunction',
          },
        },
      },
    });

    viewTheResponseRoute(app);
    const handler = getHandler();
    const res = { render: jest.fn() } as unknown as Response;

    await handler(
      viewTheResponseRequest({
        caseReference,
        sessionUser: { accessToken: 'access-token-1' },
      }),
      res,
      jest.fn()
    );

    const { counterclaim } = (res.render as jest.Mock).mock.calls[0][1];
    expect(counterclaim.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: { text: 'viewTheResponse:counterclaim.against' },
          value: { text: 'Claimant Org, Peter Parker' },
        }),
      ])
    );
    expect(counterclaim.rows).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: { text: 'viewTheResponse:counterclaim.amountKnown' },
        }),
      ])
    );
  });

  it('should format yes/no values regardless of API casing', async () => {
    mockCaseById({
      possessionClaimResponse: {
        defendantResponses: {
          disputeClaim: 'Yes',
          rentArrearsAmountConfirmation: 'No',
          makeCounterClaim: 'Yes',
          counterClaim: {
            claimType: 'PAYMENT_OR_COMPENSATION',
            isClaimAmountKnown: 'Yes',
            claimAmount: '500000',
          },
        } as unknown as CcdDefendantResponses,
      },
    });

    viewTheResponseRoute(app);
    const handler = getHandler();
    const res = { render: jest.fn() } as unknown as Response;

    await handler(
      viewTheResponseRequest({
        caseReference,
        sessionUser: { accessToken: 'access-token-1' },
      }),
      res,
      jest.fn()
    );

    const renderArgs = (res.render as jest.Mock).mock.calls[0][1];
    expect(renderArgs.responseToClaim.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: { text: 'viewTheResponse:responseToClaim.disputeClaim' },
          value: { text: 'Yes' },
        }),
        expect.objectContaining({
          key: { text: 'viewTheResponse:responseToClaim.rentArrearsAmountConfirmation' },
          value: { text: 'No' },
        }),
      ])
    );
    expect(renderArgs.counterclaim.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: { text: 'viewTheResponse:counterclaim.amountKnown' },
          value: { text: 'Yes' },
        }),
      ])
    );
  });

  it('should resolve claimant name from claimantOrganisations when case-level name is absent', async () => {
    mockCaseById({
      possessionClaimResponse: {
        claimantOrganisations: [{ id: 'claimant-1', value: 'Possession Claims Solicitor Org' }],
        defendantResponses: {},
      },
    } as CcdCaseData);

    viewTheResponseRoute(app);
    const handler = getHandler();
    const res = { render: jest.fn() } as unknown as Response;

    await handler(
      viewTheResponseRequest({
        caseReference,
        sessionUser: { accessToken: 'access-token-1' },
      }),
      res,
      jest.fn()
    );

    const renderArgs = (res.render as jest.Mock).mock.calls[0][1];
    expect(renderArgs.claimantDetails.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: { text: 'viewTheResponse:claimantDetails.name' },
          value: { text: 'Possession Claims Solicitor Org' },
        }),
      ])
    );
  });

  it('should show universal credit as no when not receiving or applying', async () => {
    mockCaseById({
      possessionClaimResponse: {
        defendantResponses: {
          householdCircumstances: {
            universalCredit: 'NO',
            hasAppliedForUniversalCredit: 'NO',
          },
        },
      },
    });

    viewTheResponseRoute(app);
    const handler = getHandler();
    const res = { render: jest.fn() } as unknown as Response;

    await handler(
      viewTheResponseRequest({
        caseReference,
        sessionUser: { accessToken: 'access-token-1' },
      }),
      res,
      jest.fn()
    );

    const renderArgs = (res.render as jest.Mock).mock.calls[0][1];
    expect(renderArgs.regularIncome.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: { text: 'viewTheResponse:income.universalCredit' },
          value: { text: 'No' },
        }),
      ])
    );
  });

  it('should handle alternate yes/no branches and invalid dates', async () => {
    mockCaseById(buildAlternateBranchesCaseData());

    viewTheResponseRoute(app);
    const handler = getHandler();
    const res = { render: jest.fn() } as unknown as Response;
    const next: NextFunction = jest.fn();

    await handler(
      viewTheResponseRequest({
        caseReference,
        sessionUser: { accessToken: 'access-token-1' },
      }),
      res,
      next
    );

    expect(next).not.toHaveBeenCalled();
    const renderArgs = (res.render as jest.Mock).mock.calls[0][1];
    expect(renderArgs.caseDates.rows[0].value.text).toBe('');
    expect(renderArgs.caseDates.rows[1].value.text).toBe('');
    expect(renderArgs.regularIncome.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: { text: 'viewTheResponse:income.universalCreditApplied' },
          value: { text: 'Yes' },
        }),
        expect.objectContaining({
          key: { text: 'viewTheResponse:income.universalCreditApplicationDate' },
          value: { text: '15 January 2026' },
        }),
      ])
    );
  });

  it('should accept numeric case reference params', async () => {
    mockCaseById({
      dateSubmitted: '2026-02-01',
      possessionClaimResponse: {
        defendantResponses: {},
      },
    });

    viewTheResponseRoute(app);
    const handler = getHandler();
    const next: NextFunction = jest.fn();

    await handler(
      viewTheResponseRequest({
        caseReference: Number(caseReference),
        sessionUser: { accessToken: 'access-token-1' },
      }),
      { render: jest.fn() } as unknown as Response,
      next
    );

    expect(ccdCaseService.getCaseById).toHaveBeenCalledWith('access-token-1', caseReference);
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 404 when defendant response is not on case data', async () => {
    mockCaseById({});

    viewTheResponseRoute(app);
    const handler = getHandler();
    const next: NextFunction = jest.fn();

    await handler(
      viewTheResponseRequest({
        caseReference,
        sessionUser: { accessToken: 'access-token-1' },
      }),
      { render: jest.fn() } as unknown as Response,
      next
    );

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'Defendant response not found' }));
  });

  it('should return 404 when case reference is invalid', async () => {
    viewTheResponseRoute(app);

    const handler = getHandler();
    const next: NextFunction = jest.fn();

    await handler(
      viewTheResponseRequest({
        caseReference: 'not-a-case-ref',
        sessionUser: { accessToken: 'access-token-1' },
      }),
      { render: jest.fn() } as unknown as Response,
      next
    );

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'Invalid case reference format' }));
    expect(ccdCaseService.getCaseById).not.toHaveBeenCalled();
  });

  it('should return 401 when access token is missing', async () => {
    viewTheResponseRoute(app);

    const handler = getHandler();
    const next: NextFunction = jest.fn();

    await handler(
      viewTheResponseRequest({
        caseReference,
        sessionUser: {},
      }),
      { render: jest.fn() } as unknown as Response,
      next
    );

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'Authentication required' }));
    expect(ccdCaseService.getCaseById).not.toHaveBeenCalled();
  });

  it('should forward errors from getCaseById', async () => {
    const serviceError = new Error('CCD unavailable');
    (ccdCaseService.getCaseById as jest.Mock).mockRejectedValue(serviceError);

    viewTheResponseRoute(app);
    const handler = getHandler();
    const next: NextFunction = jest.fn();

    await handler(
      viewTheResponseRequest({
        caseReference,
        sessionUser: { accessToken: 'access-token-1' },
      }),
      { render: jest.fn() } as unknown as Response,
      next
    );

    expect(next).toHaveBeenCalledWith(serviceError);
  });
});
