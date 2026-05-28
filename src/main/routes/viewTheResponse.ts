import { format, parseISO } from 'date-fns';
import { Application, NextFunction, Request, Response } from 'express';
import type { TFunction } from 'i18next';

import { HTTPError } from '../HttpError';
import { VIEW_DOCUMENTS_ROUTE, VIEW_RESPONSE_ROUTE } from '../constants/caseRoutes';
import { oidcMiddleware } from '../middleware';
import { penceToPounds } from '../steps/utils';

import { getTranslationFunction } from '@modules/i18n';
import { Logger } from '@modules/logger';
import { getDashboardUrl } from '@routes/dashboard';
import type {
  CcdCaseAddress,
  CcdCaseData,
  CcdClaimGroundSummaryItem,
  CcdCounterClaim,
  CcdDefendantParty,
  CcdDefendantResponses,
  HouseholdCircumstances,
  IncomeExpenseDetails,
  PaymentAgreement,
  YesNoNotSureValue,
  YesNoValue,
} from '@services/ccdCase.interface';
import { ccdCaseService } from '@services/ccdCaseService';
import { sanitiseCaseReference } from '@utils/caseReference';
import { formatAddress } from '@utils/ccdDashboardUtils';

const logger = Logger.getLogger('viewTheResponse');

const GDS_DATE_FORMAT = 'd MMMM yyyy';

interface SummaryRow {
  key: { text: string };
  value: { text: string };
}

function summaryKey(text: string): SummaryRow['key'] {
  return { text };
}

interface SummarySection {
  rows: SummaryRow[];
}

function formatGdsDate(value: string | undefined | null): string | null {
  if (!value) {
    return null;
  }
  const candidates = [value, value.substring(0, 10)];
  for (const candidate of candidates) {
    try {
      return format(parseISO(candidate), GDS_DATE_FORMAT);
    } catch {
      continue;
    }
  }
  return null;
}

function yesNo(t: TFunction, value: YesNoValue | undefined): string {
  if (value === 'YES') {
    return t('common:options.yes');
  }
  if (value === 'NO') {
    return t('common:options.no');
  }
  return '';
}

function yesNoNotSure(t: TFunction, value: YesNoNotSureValue | undefined): string {
  if (value === 'YES') {
    return t('common:options.yes');
  }
  if (value === 'NO') {
    return t('common:options.no');
  }
  if (value === 'NOT_SURE') {
    return t('common:options.imNotSure');
  }
  return '';
}

function frequencyLabel(t: TFunction, frequency: string | undefined | null): string {
  if (frequency === 'WEEKLY') {
    return t('viewTheResponse:frequency.weekly');
  }
  if (frequency === 'MONTHLY') {
    return t('viewTheResponse:frequency.monthly');
  }
  return '';
}

function formatMoneyAmount(pence: string | number | undefined): string {
  const pounds = penceToPounds(pence);
  return pounds ? `£${pounds}` : '';
}

function formatAmountAndFrequency(
  t: TFunction,
  amount: string | undefined,
  frequency: string | undefined | null
): string {
  const money = formatMoneyAmount(amount);
  const freq = frequencyLabel(t, frequency);
  if (money && freq) {
    return `${money} ${freq.toLowerCase()}`;
  }
  return money || freq;
}

function joinName(firstName?: string, lastName?: string): string {
  return [firstName, lastName].filter(Boolean).join(' ').trim();
}

function addressToString(address: CcdCaseAddress | Record<string, never> | undefined): string {
  if (!address || Object.keys(address).length === 0) {
    return '';
  }
  return formatAddress(address as CcdCaseAddress) ?? '';
}

function pushRow(rows: SummaryRow[], label: string, value: string | null | undefined): void {
  if (value && value.trim().length > 0) {
    rows.push({ key: summaryKey(label), value: { text: value } });
  }
}

function buildCaseDatesSummary(t: TFunction, dateSubmitted: string | null, dateIssued: string | null): SummarySection {
  return {
    rows: [
      { key: summaryKey(t('viewTheResponse:summary.dateSubmitted')), value: { text: dateSubmitted ?? '' } },
      { key: summaryKey(t('viewTheResponse:summary.dateIssued')), value: { text: dateIssued ?? '' } },
    ],
  };
}

function buildStatementOfTruthSummary(t: TFunction, completedByName: string | undefined): SummarySection {
  return {
    rows: [
      {
        key: summaryKey(t('viewTheResponse:statementOfTruth.completedBy')),
        value: { text: completedByName?.trim() ?? '' },
      },
    ],
  };
}

function buildClaimantDetails(t: TFunction, caseData: CcdCaseData): SummarySection {
  const rows: SummaryRow[] = [];
  const response = caseData.possessionClaimResponse;
  pushRow(rows, t('viewTheResponse:claimantDetails.name'), response?.claimantName);
  pushRow(
    rows,
    t('viewTheResponse:claimantDetails.address'),
    response?.claimantServiceAddress ? (formatAddress(response.claimantServiceAddress) ?? '') : ''
  );
  return { rows };
}

function buildContactPreferences(t: TFunction, responses: CcdDefendantResponses | undefined): string {
  if (!responses) {
    return '';
  }
  const prefs: string[] = [];
  if (responses.contactByText === 'YES') {
    prefs.push(t('viewTheResponse:contactPreference.text'));
  }
  if (responses.contactByPhone === 'YES') {
    prefs.push(t('viewTheResponse:contactPreference.phone'));
  }
  if (responses.contactByEmail === 'YES') {
    prefs.push(t('viewTheResponse:contactPreference.email'));
  }
  if (responses.contactByPost === 'YES') {
    prefs.push(t('viewTheResponse:contactPreference.post'));
  }
  return prefs.join(', ');
}

function buildDefendant1Details(t: TFunction, caseData: CcdCaseData): SummarySection {
  const rows: SummaryRow[] = [];
  const party: CcdDefendantParty | undefined = caseData.possessionClaimResponse?.defendantContactDetails?.party;
  const responses = caseData.possessionClaimResponse?.defendantResponses;

  pushRow(rows, t('viewTheResponse:defendant1.name'), joinName(party?.firstName, party?.lastName));
  pushRow(rows, t('viewTheResponse:defendant1.dateOfBirth'), formatGdsDate(responses?.dateOfBirth) ?? '');
  pushRow(rows, t('viewTheResponse:defendant1.email'), party?.emailAddress);
  if (party?.phoneNumberProvided === 'YES') {
    pushRow(rows, t('viewTheResponse:defendant1.phone'), party?.phoneNumber);
  }
  pushRow(rows, t('viewTheResponse:defendant1.address'), addressToString(party?.address));
  pushRow(rows, t('viewTheResponse:defendant1.contactPreferences'), buildContactPreferences(t, responses));
  pushRow(rows, t('viewTheResponse:defendant1.freeLegalAdvice'), responses?.freeLegalAdvice);
  return { rows };
}

function buildClaimGroundsText(grounds: CcdClaimGroundSummaryItem[] | undefined): string {
  return (grounds ?? [])
    .map(g => g.value?.label)
    .filter((l): l is string => !!l)
    .join(', ');
}

function buildResponseToClaim(t: TFunction, caseData: CcdCaseData): SummarySection {
  const rows: SummaryRow[] = [];
  const responses = caseData.possessionClaimResponse?.defendantResponses;

  pushRow(rows, t('viewTheResponse:responseToClaim.disputeClaim'), yesNo(t, responses?.disputeClaim));
  pushRow(rows, t('viewTheResponse:responseToClaim.disputeDetails'), responses?.disputeClaimDetails);
  pushRow(
    rows,
    t('viewTheResponse:responseToClaim.claimGrounds'),
    buildClaimGroundsText(caseData.claimGroundSummaries)
  );
  pushRow(
    rows,
    t('viewTheResponse:responseToClaim.tenancyTypeConfirmation'),
    yesNoNotSure(t, responses?.tenancyTypeConfirmation)
  );
  pushRow(rows, t('viewTheResponse:responseToClaim.tenancyType'), responses?.tenancyType);
  pushRow(
    rows,
    t('viewTheResponse:responseToClaim.tenancyStartDateConfirmation'),
    yesNoNotSure(t, responses?.tenancyStartDateConfirmation)
  );
  pushRow(
    rows,
    t('viewTheResponse:responseToClaim.tenancyStartDate'),
    formatGdsDate(responses?.tenancyStartDate) ?? ''
  );
  pushRow(
    rows,
    t('viewTheResponse:responseToClaim.possessionNoticeReceived'),
    yesNoNotSure(t, responses?.possessionNoticeReceived)
  );
  pushRow(
    rows,
    t('viewTheResponse:responseToClaim.noticeReceivedDate'),
    formatGdsDate(responses?.noticeReceivedDate) ?? ''
  );
  pushRow(
    rows,
    t('viewTheResponse:responseToClaim.rentArrearsAmountConfirmation'),
    responses?.rentArrearsAmountConfirmation
  );
  pushRow(
    rows,
    t('viewTheResponse:responseToClaim.rentArrearsAmount'),
    formatMoneyAmount(responses?.rentArrearsAmount)
  );
  pushRow(
    rows,
    t('viewTheResponse:responseToClaim.landlordRegistered'),
    yesNoNotSure(t, responses?.landlordRegistered)
  );
  pushRow(rows, t('viewTheResponse:responseToClaim.landlordLicensed'), yesNoNotSure(t, responses?.landlordLicensed));
  pushRow(rows, t('viewTheResponse:responseToClaim.writtenTerms'), yesNoNotSure(t, responses?.writtenTerms));
  return { rows };
}

function buildPaymentsOrAgreements(t: TFunction, caseData: CcdCaseData): SummarySection {
  const rows: SummaryRow[] = [];
  const payment: PaymentAgreement | undefined = caseData.possessionClaimResponse?.defendantResponses?.paymentAgreement;
  if (!payment) {
    return { rows };
  }
  pushRow(rows, t('viewTheResponse:payments.anyPaymentsMade'), yesNo(t, payment.anyPaymentsMade));
  pushRow(rows, t('viewTheResponse:payments.paymentDetails'), payment.paymentDetails);
  pushRow(rows, t('viewTheResponse:payments.repaymentPlanAgreed'), yesNoNotSure(t, payment.repaymentPlanAgreed));
  pushRow(rows, t('viewTheResponse:payments.repaymentAgreedDetails'), payment.repaymentAgreedDetails);
  pushRow(rows, t('viewTheResponse:payments.repayArrearsInstalments'), yesNo(t, payment.repayArrearsInstalments));
  pushRow(
    rows,
    t('viewTheResponse:payments.additionalContribution'),
    formatAmountAndFrequency(t, payment.additionalRentContribution, payment.additionalContributionFrequency)
  );
  return { rows };
}

function buildHouseholdAndCircumstances(t: TFunction, caseData: CcdCaseData): SummarySection {
  const rows: SummaryRow[] = [];
  const hc: HouseholdCircumstances | undefined =
    caseData.possessionClaimResponse?.defendantResponses?.householdCircumstances;
  if (!hc) {
    return { rows };
  }
  pushRow(rows, t('viewTheResponse:household.shareAdditional'), yesNo(t, hc.shareAdditionalCircumstances));
  pushRow(rows, t('viewTheResponse:household.additionalDetails'), hc.additionalCircumstancesDetails);
  pushRow(rows, t('viewTheResponse:household.exceptionalHardship'), yesNo(t, hc.exceptionalHardship));
  pushRow(rows, t('viewTheResponse:household.exceptionalHardshipDetails'), hc.exceptionalHardshipDetails);
  pushRow(rows, t('viewTheResponse:household.dependantChildren'), yesNo(t, hc.dependantChildren));
  pushRow(rows, t('viewTheResponse:household.dependantChildrenDetails'), hc.dependantChildrenDetails);
  pushRow(rows, t('viewTheResponse:household.otherDependants'), yesNo(t, hc.otherDependants));
  pushRow(rows, t('viewTheResponse:household.otherDependantDetails'), hc.otherDependantDetails);
  pushRow(rows, t('viewTheResponse:household.alternativeAccommodation'), yesNoNotSure(t, hc.alternativeAccommodation));
  pushRow(
    rows,
    t('viewTheResponse:household.alternativeAccommodationDate'),
    formatGdsDate(hc.alternativeAccommodationTransferDate) ?? ''
  );
  pushRow(rows, t('viewTheResponse:household.otherTenants'), yesNo(t, hc.otherTenants));
  pushRow(rows, t('viewTheResponse:household.otherTenantsDetails'), hc.otherTenantsDetails);
  return { rows };
}

function buildIncomeRow(
  t: TFunction,
  rows: SummaryRow[],
  applies: YesNoValue | undefined,
  amount: string | undefined,
  frequency: string | undefined,
  labelKey: string
): void {
  if (applies !== 'YES') {
    pushRow(rows, t(labelKey), yesNo(t, applies));
    return;
  }
  pushRow(rows, t(labelKey), formatAmountAndFrequency(t, amount, frequency));
}

function buildRegularIncome(t: TFunction, caseData: CcdCaseData): SummarySection {
  const rows: SummaryRow[] = [];
  const hc = caseData.possessionClaimResponse?.defendantResponses?.householdCircumstances;
  if (!hc) {
    return { rows };
  }
  buildIncomeRow(
    t,
    rows,
    hc.incomeFromJobs,
    hc.incomeFromJobsAmount,
    hc.incomeFromJobsFrequency,
    'viewTheResponse:income.fromJobs'
  );
  buildIncomeRow(t, rows, hc.pension, hc.pensionAmount, hc.pensionFrequency, 'viewTheResponse:income.pension');
  if (hc.universalCredit === 'YES') {
    pushRow(
      rows,
      t('viewTheResponse:income.universalCredit'),
      formatAmountAndFrequency(t, hc.universalCreditAmount ?? undefined, hc.universalCreditFrequency ?? undefined)
    );
  } else if (hc.hasAppliedForUniversalCredit === 'YES') {
    pushRow(
      rows,
      t('viewTheResponse:income.universalCreditApplied'),
      formatGdsDate(hc.ucApplicationDate) ?? t('common:options.yes')
    );
  } else {
    pushRow(rows, t('viewTheResponse:income.universalCredit'), yesNo(t, hc.universalCredit));
  }
  buildIncomeRow(
    t,
    rows,
    hc.otherBenefits,
    hc.otherBenefitsAmount,
    hc.otherBenefitsFrequency,
    'viewTheResponse:income.otherBenefits'
  );
  pushRow(rows, t('viewTheResponse:income.moneyFromElsewhere'), yesNo(t, hc.moneyFromElsewhere));
  pushRow(rows, t('viewTheResponse:income.moneyFromElsewhereDetails'), hc.moneyFromElsewhereDetails);
  return { rows };
}

function buildPriorityDebts(t: TFunction, caseData: CcdCaseData): SummarySection {
  const rows: SummaryRow[] = [];
  const hc = caseData.possessionClaimResponse?.defendantResponses?.householdCircumstances;
  if (!hc) {
    return { rows };
  }
  pushRow(rows, t('viewTheResponse:debts.hasPriorityDebts'), yesNo(t, hc.priorityDebts));
  pushRow(rows, t('viewTheResponse:debts.debtTotal'), formatMoneyAmount(hc.debtTotal));
  pushRow(
    rows,
    t('viewTheResponse:debts.debtContribution'),
    formatAmountAndFrequency(t, hc.debtContribution, hc.debtContributionFrequency)
  );
  return { rows };
}

function buildExpenseRow(
  t: TFunction,
  rows: SummaryRow[],
  detail: IncomeExpenseDetails | undefined,
  labelKey: string
): void {
  if (!detail) {
    return;
  }
  if (detail.applies !== 'YES') {
    pushRow(rows, t(labelKey), yesNo(t, detail.applies));
    return;
  }
  pushRow(rows, t(labelKey), formatAmountAndFrequency(t, detail.amount, detail.frequency));
}

function buildRegularExpenses(t: TFunction, caseData: CcdCaseData): SummarySection {
  const rows: SummaryRow[] = [];
  const hc = caseData.possessionClaimResponse?.defendantResponses?.householdCircumstances;
  if (!hc) {
    return { rows };
  }
  buildExpenseRow(t, rows, hc.householdBills, 'viewTheResponse:expenses.householdBills');
  buildExpenseRow(t, rows, hc.loanPayments, 'viewTheResponse:expenses.loanPayments');
  buildExpenseRow(t, rows, hc.childSpousalMaintenance, 'viewTheResponse:expenses.childSpousalMaintenance');
  buildExpenseRow(t, rows, hc.mobilePhone, 'viewTheResponse:expenses.mobilePhone');
  buildExpenseRow(t, rows, hc.groceryShopping, 'viewTheResponse:expenses.groceryShopping');
  buildExpenseRow(t, rows, hc.fuelParkingTransport, 'viewTheResponse:expenses.fuelParkingTransport');
  buildExpenseRow(t, rows, hc.schoolCosts, 'viewTheResponse:expenses.schoolCosts');
  buildExpenseRow(t, rows, hc.clothing, 'viewTheResponse:expenses.clothing');
  buildExpenseRow(t, rows, hc.otherExpenses, 'viewTheResponse:expenses.other');
  return { rows };
}

function buildAdditionalInformation(t: TFunction, caseData: CcdCaseData): SummarySection {
  const rows: SummaryRow[] = [];
  const responses = caseData.possessionClaimResponse?.defendantResponses;
  pushRow(rows, t('viewTheResponse:additional.otherConsiderations'), yesNo(t, responses?.otherConsiderations));
  pushRow(rows, t('viewTheResponse:additional.otherConsiderationsDetails'), responses?.otherConsiderationsDetails);
  return { rows };
}

function buildCounterclaim(t: TFunction, caseData: CcdCaseData): SummarySection {
  const rows: SummaryRow[] = [];
  const responses = caseData.possessionClaimResponse?.defendantResponses;
  pushRow(rows, t('viewTheResponse:counterclaim.make'), yesNo(t, responses?.makeCounterClaim));
  const cc: CcdCounterClaim | undefined = responses?.counterClaim;
  if (cc) {
    pushRow(rows, t('viewTheResponse:counterclaim.type'), cc.claimType);
    pushRow(rows, t('viewTheResponse:counterclaim.amountKnown'), cc.isClaimAmountKnown);
    pushRow(rows, t('viewTheResponse:counterclaim.amount'), formatMoneyAmount(cc.claimAmount));
    pushRow(rows, t('viewTheResponse:counterclaim.estimatedMaxAmount'), formatMoneyAmount(cc.estimatedMaxClaimAmount));
    pushRow(rows, t('viewTheResponse:counterclaim.needHelpWithFees'), yesNo(t, cc.needHelpWithFees));
  }
  return { rows };
}

export default function viewTheResponseRoutes(app: Application): void {
  app.get(VIEW_RESPONSE_ROUTE, oidcMiddleware, async (req: Request, res: Response, next: NextFunction) => {
    const rawRef = req.params?.caseReference;
    const caseReference =
      typeof rawRef === 'string' || typeof rawRef === 'number' ? sanitiseCaseReference(rawRef) : null;

    if (!caseReference) {
      logger.error('Invalid case reference format', { caseReference: rawRef });
      return next(new HTTPError('Invalid case reference format', 404));
    }

    const accessToken = req.session.user?.accessToken;
    if (!accessToken) {
      logger.error('viewTheResponse: user not authenticated - no access token');
      return next(new HTTPError('Authentication required', 401));
    }

    try {
      const caseData = await ccdCaseService.getViewDefendantResponse(accessToken, caseReference);
      const responses = caseData.possessionClaimResponse?.defendantResponses;

      const t = getTranslationFunction(req, ['viewTheResponse', 'common']);

      const dateSubmitted = formatGdsDate(responses?.responseSubmittedDate);
      const dateIssued = formatGdsDate(caseData.possessionClaimResponse?.claimIssuedDate);
      const completedBy = responses?.statementOfTruthCompletedBy;

      const sections = {
        claimantDetails: buildClaimantDetails(t, caseData),
        defendant1Details: buildDefendant1Details(t, caseData),
        responseToClaim: buildResponseToClaim(t, caseData),
        paymentsOrAgreements: buildPaymentsOrAgreements(t, caseData),
        householdAndCircumstances: buildHouseholdAndCircumstances(t, caseData),
        regularIncome: buildRegularIncome(t, caseData),
        priorityDebts: buildPriorityDebts(t, caseData),
        regularExpenses: buildRegularExpenses(t, caseData),
        additionalInformation: buildAdditionalInformation(t, caseData),
        counterclaim: buildCounterclaim(t, caseData),
      };

      return res.render('view-the-response', {
        t,
        propertyAddress: formatAddress(caseData.propertyAddress),
        caseReferenceDisplay: caseReference.replace(/(\d{4})(?=\d)/g, '$1 '),
        caseDates: buildCaseDatesSummary(t, dateSubmitted, dateIssued),
        statementOfTruth: buildStatementOfTruthSummary(t, completedBy),
        dateSubmitted,
        ...sections,
        dashboardUrl: getDashboardUrl(caseReference),
        viewDocumentsUrl: VIEW_DOCUMENTS_ROUTE.replace(':caseReference', caseReference),
      });
    } catch (e) {
      logger.error(`Failed to fetch case data for case ${caseReference}. Error was: ${String(e)}`);
      return next(e);
    }
  });
}
