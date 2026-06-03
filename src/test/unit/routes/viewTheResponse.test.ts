import type { Application, NextFunction, Request, RequestHandler, Response } from 'express';

import { VIEW_RESPONSE_ROUTE } from '../../../main/constants/caseRoutes';
import { oidcMiddleware } from '../../../main/middleware';

import viewTheResponseRoute from '@routes/viewTheResponse';
import type { CcdCaseData } from '@services/ccdCase.interface';
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
    possessionClaimResponse: {
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
        responseSubmittedDate: '2026-02-01',
        statementOfTruthCompletedBy: 'Jane Defendant',
        contactByText: 'YES',
        contactByPhone: 'YES',
        contactByEmail: 'YES',
        contactByPost: 'YES',
        freeLegalAdvice: 'Citizens Advice',
        dateOfBirth: '1990-05-15',
        disputeClaim: 'YES',
        disputeClaimDetails: 'I dispute the amount claimed',
        tenancyTypeConfirmation: 'NOT_SURE',
        tenancyType: 'Assured shorthold',
        tenancyStartDateConfirmation: 'YES',
        tenancyStartDate: '2018-03-01',
        possessionNoticeReceived: 'NO',
        noticeReceivedDate: '2025-12-01',
        rentArrearsAmountConfirmation: 'Confirmed',
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
          claimType: 'Disrepair',
          isClaimAmountKnown: 'YES',
          claimAmount: '500000',
          estimatedMaxClaimAmount: '750000',
          needHelpWithFees: 'NO',
        },
      },
    },
  };
}

function buildAlternateBranchesCaseData(): CcdCaseData {
  return {
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
        responseSubmittedDate: 'also-invalid',
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
      possessionClaimResponse: {
        claimIssuedDate: '2026-02-05',
        defendantResponses: {
          responseSubmittedDate: '2026-02-01',
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
              key: { text: 'viewTheResponse:summary.dateSubmitted' },
              value: { text: '1 February 2026' },
            }),
            expect.objectContaining({
              key: { text: 'viewTheResponse:summary.dateIssued' },
              value: { text: '5 February 2026' },
            }),
          ]),
        }),
        dashboardUrl: `/dashboard/${caseReference}`,
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
    expect(renderArgs.responseToClaim.rows.length).toBeGreaterThan(0);
    expect(renderArgs.paymentsOrAgreements.rows.length).toBeGreaterThan(0);
    expect(renderArgs.householdAndCircumstances.rows.length).toBeGreaterThan(0);
    expect(renderArgs.regularIncome.rows.length).toBeGreaterThan(0);
    expect(renderArgs.priorityDebts.rows.length).toBeGreaterThan(0);
    expect(renderArgs.regularExpenses.rows.length).toBeGreaterThan(0);
    expect(renderArgs.additionalInformation.rows.length).toBeGreaterThan(0);
    expect(renderArgs.counterclaim.rows.length).toBeGreaterThan(0);
    expect(renderArgs.defendant1Details.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: { text: 'viewTheResponse:defendant1.contactPreferences' },
          value: {
            text: 'viewTheResponse:contactPreference.text, viewTheResponse:contactPreference.phone, viewTheResponse:contactPreference.email, viewTheResponse:contactPreference.post',
          },
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
          value: { text: '15 January 2026' },
        }),
      ])
    );
  });

  it('should accept numeric case reference params', async () => {
    mockCaseById({
      possessionClaimResponse: {
        defendantResponses: { responseSubmittedDate: '2026-02-01' },
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
