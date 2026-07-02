import { format, parseISO } from 'date-fns';
import { Application, NextFunction, Request, Response } from 'express';
import type { TFunction } from 'i18next';

import { HTTPError } from '../HttpError';
import { VIEW_DOCUMENTS_ROUTE, VIEW_RESPONSE_ROUTE } from '../constants/caseRoutes';
import { oidcMiddleware } from '../middleware';
import { normalizeYesNoValue, penceToPounds } from '../steps/utils';

import { getTranslationFunction } from '@modules/i18n';
import { Logger } from '@modules/logger';
import { getDashboardUrl } from '@routes/dashboard';
import type {
  CcdCaseAddress,
  CcdCaseData,
  CcdCollectionItem,
  CcdCounterClaim,
  CcdDefendantParty,
  CcdParty,
  HouseholdCircumstances,
  IncomeExpenseDetails,
  PaymentAgreement,
  YesNoNotSureValue,
  YesNoValue,
} from '@services/ccdCase.interface';
import { CcdCaseModel } from '@services/ccdCaseData.model';
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

interface TitledSummarySection extends SummarySection {
  sectionTitle: string;
}

interface AdditionalDefendantParty {
  firstName?: string;
  lastName?: string;
  nameKnown?: string;
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

function isYes(value: string | null | undefined): boolean {
  return normalizeYesNoValue(value) === 'YES';
}

function isNo(value: string | null | undefined): boolean {
  return normalizeYesNoValue(value) === 'NO';
}

function yesNo(t: TFunction, value: YesNoValue | string | undefined): string {
  if (!value) {
    return '';
  }
  const normalized = normalizeYesNoValue(value);
  if (normalized === 'YES') {
    return t('common:options.yes');
  }
  if (normalized === 'NO') {
    return t('common:options.no');
  }
  return '';
}

function yesNoNotSure(t: TFunction, value: YesNoNotSureValue | string | undefined): string {
  if (!value) {
    return '';
  }
  const yesNoLabel = yesNo(t, value);
  if (yesNoLabel) {
    return yesNoLabel;
  }
  if (value.trim().toUpperCase() === 'NOT_SURE') {
    return t('common:options.imNotSure');
  }
  return '';
}

function formatMoneyAmount(pence: string | number | undefined): string {
  const pounds = penceToPounds(pence);
  return pounds ? `£${pounds}` : '';
}

function formatIncomeValue(t: TFunction, amount: string | undefined, frequency: string | undefined | null): string {
  const money = formatMoneyAmount(amount);
  const freq =
    frequency === 'WEEKLY' || frequency === 'MONTHLY' ? t(`viewTheResponse:incomeFrequencies.${frequency}`) : '';
  if (money && freq) {
    return `${money} ${freq}`;
  }
  return money || freq;
}

function formatPaymentValue(t: TFunction, amount: string | undefined, frequency: string | undefined | null): string {
  const money = formatMoneyAmount(amount);
  const freq =
    frequency === 'WEEKLY' || frequency === 'MONTHLY' ? t(`viewTheResponse:paymentFrequencies.${frequency}`) : '';
  if (money && freq) {
    return `${money} ${freq}`;
  }
  return money || freq;
}

function frequencyLabel(t: TFunction, frequency: string | undefined | null): string {
  if (!frequency) {
    return '';
  }
  const labelKey = {
    weekly: 'viewTheResponse:frequency.weekly',
    every2Weeks: 'viewTheResponse:frequency.every2Weeks',
    every4Weeks: 'viewTheResponse:frequency.every4Weeks',
    monthly: 'viewTheResponse:frequency.monthly',
    WEEKLY: 'viewTheResponse:frequency.weekly',
    MONTHLY: 'viewTheResponse:frequency.monthly',
  }[frequency];
  return labelKey ? t(labelKey) : '';
}

function joinName(firstName?: string, lastName?: string): string {
  return [firstName, lastName].filter(Boolean).join(' ').trim();
}

function resolveAdditionalDefendantName(t: TFunction, party: AdditionalDefendantParty): string {
  if (isNo(party.nameKnown)) {
    return t('viewTheResponse:personsUnknown');
  }
  const name = joinName(party.firstName, party.lastName);
  return name || t('viewTheResponse:personsUnknown');
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
      { key: summaryKey(t('viewTheResponse:summary.dateIssued')), value: { text: dateIssued ?? '' } },
      { key: summaryKey(t('viewTheResponse:summary.dateSubmitted')), value: { text: dateSubmitted ?? '' } },
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

function partyDisplayName(party: CcdParty | undefined): string {
  return [party?.orgName, party?.firstName, party?.lastName].filter(Boolean).join(' ').trim();
}

function formatCounterClaimParties(parties: CcdCollectionItem<CcdParty>[] | undefined): string {
  return (parties ?? [])
    .map(p => partyDisplayName(p.value))
    .filter(Boolean)
    .join(', ');
}

function buildClaimantDetails(t: TFunction, caseData: CcdCaseData): SummarySection {
  const rows: SummaryRow[] = [];
  const serviceAddress = caseData.possessionClaimResponse?.claimantServiceAddress;
  pushRow(rows, t('viewTheResponse:claimantDetails.name'), resolveClaimantName(caseData));
  pushRow(
    rows,
    t('viewTheResponse:claimantDetails.address'),
    serviceAddress ? (formatAddress(serviceAddress) ?? '') : ''
  );
  return { rows };
}

function resolveClaimantName(caseData: CcdCaseData): string {
  return new CcdCaseModel({ id: '', data: caseData }).claimantName;
}

function buildDefendant1Details(t: TFunction, caseData: CcdCaseData): SummarySection {
  const rows: SummaryRow[] = [];
  const party: CcdDefendantParty | undefined = caseData.possessionClaimResponse?.defendantContactDetails?.party;
  const responses = caseData.possessionClaimResponse?.defendantResponses;

  pushRow(rows, t('viewTheResponse:defendant1.name'), joinName(party?.firstName, party?.lastName));
  if (isYes(party?.phoneNumberProvided)) {
    pushRow(rows, t('viewTheResponse:defendant1.phone'), party?.phoneNumber);
  }
  pushRow(rows, t('viewTheResponse:defendant1.address'), addressToString(party?.address));
  pushRow(rows, t('viewTheResponse:defendant1.dateOfBirth'), formatGdsDate(responses?.dateOfBirth) ?? '');
  return { rows };
}

function buildAdditionalDefendantDetails(t: TFunction, caseData: CcdCaseData): TitledSummarySection[] {
  const defendants = caseData.allDefendants ?? [];
  if (defendants.length < 2) {
    return [];
  }

  const currentDefendantPartyId = caseData.possessionClaimResponse?.currentDefendantPartyId;

  return defendants
    .filter(defendant => !currentDefendantPartyId || defendant.id !== currentDefendantPartyId)
    .map((defendant, index) => {
      const party = defendant.value as AdditionalDefendantParty;
      const rows: SummaryRow[] = [];

      pushRow(rows, t('viewTheResponse:defendant1.name'), resolveAdditionalDefendantName(t, party));

      return {
        sectionTitle: t('viewTheResponse:sections.additionalDefendantDetails', { number: index + 1 }),
        rows,
      };
    });
}

function buildResponseToClaim(t: TFunction, caseData: CcdCaseData): SummarySection {
  const rows: SummaryRow[] = [];
  const responses = caseData.possessionClaimResponse?.defendantResponses;

  pushRow(rows, t('viewTheResponse:responseToClaim.exemptLandlord'), yesNoNotSure(t, responses?.landlordRegistered));
  pushRow(
    rows,
    t('viewTheResponse:responseToClaim.tenancyTypeConfirmation'),
    yesNoNotSure(t, responses?.tenancyTypeConfirmation)
  );
  if (isNo(responses?.tenancyTypeConfirmation)) {
    pushRow(rows, t('viewTheResponse:responseToClaim.tenancyType'), responses?.tenancyType);
  }
  pushRow(
    rows,
    t('viewTheResponse:responseToClaim.tenancyStartDateConfirmation'),
    yesNoNotSure(t, responses?.tenancyStartDateConfirmation)
  );
  if (isNo(responses?.tenancyStartDateConfirmation)) {
    pushRow(
      rows,
      t('viewTheResponse:responseToClaim.tenancyStartDate'),
      formatGdsDate(responses?.tenancyStartDate) ?? ''
    );
  }
  pushRow(rows, t('viewTheResponse:responseToClaim.writtenTerms'), yesNoNotSure(t, responses?.writtenTerms));
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
    yesNoNotSure(t, responses?.rentArrearsAmountConfirmation)
  );
  if (isNo(responses?.rentArrearsAmountConfirmation)) {
    pushRow(
      rows,
      t('viewTheResponse:responseToClaim.rentArrearsAmount'),
      formatMoneyAmount(responses?.rentArrearsAmount)
    );
  }
  pushRow(rows, t('viewTheResponse:responseToClaim.disputeClaim'), yesNo(t, responses?.disputeClaim));
  if (isYes(responses?.disputeClaim)) {
    pushRow(rows, t('viewTheResponse:responseToClaim.disputeDetails'), responses?.disputeClaimDetails);
  }
  pushRow(rows, t('viewTheResponse:responseToClaim.makeCounterClaim'), yesNo(t, responses?.makeCounterClaim));
  return { rows };
}

function resolveClaimIssueDate(caseData: CcdCaseData, dateIssued: string | null): string {
  return (
    formatGdsDate(caseData.claimIssueDate) ??
    formatGdsDate(caseData.possessionClaimResponse?.claimIssuedDate) ??
    dateIssued ??
    ''
  );
}

function buildPaymentsOrAgreements(t: TFunction, caseData: CcdCaseData, dateIssued: string | null): SummarySection {
  const rows: SummaryRow[] = [];
  const payment: PaymentAgreement | undefined = caseData.possessionClaimResponse?.defendantResponses?.paymentAgreement;
  if (!payment) {
    return { rows };
  }
  const paymentLabelContext = {
    claimantName: resolveClaimantName(caseData),
    claimIssueDate: resolveClaimIssueDate(caseData, dateIssued),
  };
  pushRow(rows, t('viewTheResponse:payments.anyPaymentsMade', paymentLabelContext), yesNo(t, payment.anyPaymentsMade));
  pushRow(rows, t('viewTheResponse:payments.paymentDetails'), payment.paymentDetails);
  pushRow(
    rows,
    t('viewTheResponse:payments.repaymentPlanAgreed', paymentLabelContext),
    yesNoNotSure(t, payment.repaymentPlanAgreed)
  );
  pushRow(rows, t('viewTheResponse:payments.repaymentAgreedDetails'), payment.repaymentAgreedDetails);
  pushRow(rows, t('viewTheResponse:payments.repayArrearsInstalments'), yesNo(t, payment.repayArrearsInstalments));
  if (payment.additionalRentContribution || payment.additionalContributionFrequency) {
    pushRow(
      rows,
      t('viewTheResponse:payments.additionalContribution'),
      formatMoneyAmount(payment.additionalRentContribution)
    );
    pushRow(
      rows,
      t('viewTheResponse:payments.additionalContributionFrequency'),
      frequencyLabel(t, payment.additionalContributionFrequency)
    );
  }
  return { rows };
}

function buildHouseholdAndCircumstances(t: TFunction, caseData: CcdCaseData): SummarySection {
  const rows: SummaryRow[] = [];
  const hc: HouseholdCircumstances | undefined =
    caseData.possessionClaimResponse?.defendantResponses?.householdCircumstances;
  if (!hc) {
    return { rows };
  }
  pushRow(rows, t('viewTheResponse:household.dependantChildren'), yesNo(t, hc.dependantChildren));
  pushRow(rows, t('viewTheResponse:household.dependantChildrenDetails'), hc.dependantChildrenDetails);
  pushRow(rows, t('viewTheResponse:household.otherDependants'), yesNo(t, hc.otherDependants));
  pushRow(rows, t('viewTheResponse:household.otherDependantDetails'), hc.otherDependantDetails);
  pushRow(rows, t('viewTheResponse:household.otherTenants'), yesNo(t, hc.otherTenants));
  pushRow(rows, t('viewTheResponse:household.otherTenantsDetails'), hc.otherTenantsDetails);
  pushRow(rows, t('viewTheResponse:household.alternativeAccommodation'), yesNoNotSure(t, hc.alternativeAccommodation));
  pushRow(
    rows,
    t('viewTheResponse:household.alternativeAccommodationDate'),
    formatGdsDate(hc.alternativeAccommodationTransferDate) ?? ''
  );
  pushRow(rows, t('viewTheResponse:household.shareAdditional'), yesNo(t, hc.shareAdditionalCircumstances));
  pushRow(rows, t('viewTheResponse:household.additionalDetails'), hc.additionalCircumstancesDetails);
  pushRow(rows, t('viewTheResponse:household.exceptionalHardship'), yesNo(t, hc.exceptionalHardship));
  pushRow(rows, t('viewTheResponse:household.exceptionalHardshipDetails'), hc.exceptionalHardshipDetails);
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
  if (!isYes(applies)) {
    pushRow(rows, t(labelKey), yesNo(t, applies));
    return;
  }
  pushRow(rows, t(labelKey), formatIncomeValue(t, amount, frequency));
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
  if (isYes(hc.universalCredit)) {
    pushRow(
      rows,
      t('viewTheResponse:income.universalCredit'),
      formatIncomeValue(t, hc.universalCreditAmount ?? undefined, hc.universalCreditFrequency ?? undefined)
    );
  } else if (isYes(hc.hasAppliedForUniversalCredit)) {
    pushRow(rows, t('viewTheResponse:income.universalCreditApplied'), t('common:options.yes'));
    pushRow(
      rows,
      t('viewTheResponse:income.universalCreditApplicationDate'),
      formatGdsDate(hc.ucApplicationDate) ?? ''
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
  if (hc.debtContribution || hc.debtContributionFrequency) {
    pushRow(
      rows,
      t('viewTheResponse:debts.debtContribution'),
      formatPaymentValue(t, hc.debtContribution, hc.debtContributionFrequency)
    );
  }
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
  if (!isYes(detail.applies)) {
    pushRow(rows, t(labelKey), yesNo(t, detail.applies));
    return;
  }
  pushRow(rows, t(labelKey), formatPaymentValue(t, detail.amount, detail.frequency));
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
  if (!responses || !isYes(responses.makeCounterClaim) || !responses.counterClaim) {
    return { rows };
  }

  const cc: CcdCounterClaim = responses.counterClaim;

  if (cc.claimType) {
    const typeLabel = t(`viewTheResponse:counterclaim.claimTypeOptions.${cc.claimType}`, cc.claimType);
    pushRow(rows, t('viewTheResponse:counterclaim.type'), typeLabel);
  }

  const claimsMoney = cc.claimType === 'PAYMENT_OR_COMPENSATION' || cc.claimType === 'BOTH';
  if (claimsMoney && cc.isClaimAmountKnown) {
    pushRow(rows, t('viewTheResponse:counterclaim.amountKnown'), yesNo(t, cc.isClaimAmountKnown));
    if (isYes(cc.isClaimAmountKnown)) {
      pushRow(rows, t('viewTheResponse:counterclaim.amount'), formatMoneyAmount(cc.claimAmount));
    } else if (isNo(cc.isClaimAmountKnown)) {
      pushRow(
        rows,
        t('viewTheResponse:counterclaim.estimatedMaxAmount'),
        formatMoneyAmount(cc.estimatedMaxClaimAmount)
      );
    }
  }

  pushRow(rows, t('viewTheResponse:counterclaim.against'), formatCounterClaimParties(cc.counterClaimAgainst));
  pushRow(rows, t('viewTheResponse:counterclaim.for'), cc.counterClaimFor);
  pushRow(rows, t('viewTheResponse:counterclaim.reasons'), cc.counterClaimReasons);
  pushRow(rows, t('viewTheResponse:counterclaim.ordersRequested'), cc.otherOrderRequestDetails);
  pushRow(rows, t('viewTheResponse:counterclaim.factsForCourt'), cc.otherOrderRequestFacts);

  if (cc.needHelpWithFees) {
    const feesLabel = t(
      `viewTheResponse:counterclaim.needHelpWithFeesOptions.${cc.needHelpWithFees}`,
      yesNo(t, cc.needHelpWithFees)
    );
    pushRow(rows, t('viewTheResponse:counterclaim.needHelpWithFees'), feesLabel);
  }
  if (cc.appliedForHwf) {
    pushRow(rows, t('viewTheResponse:counterclaim.appliedForHwf'), yesNo(t, cc.appliedForHwf));
    if (isYes(cc.appliedForHwf)) {
      pushRow(rows, t('viewTheResponse:counterclaim.hwfReference'), cc.hwfReferenceNumber);
    }
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
      const ccdCase = await ccdCaseService.getCaseById(accessToken, caseReference);
      const caseData = ccdCase.data;
      const responses = caseData.possessionClaimResponse?.defendantResponses;

      if (!responses) {
        return next(new HTTPError('Defendant response not found', 404));
      }

      const t = getTranslationFunction(req, ['viewTheResponse', 'common']);

      const dateSubmitted = formatGdsDate(caseData.dateSubmitted);
      const dateIssued = formatGdsDate(caseData.possessionClaimResponse?.claimIssuedDate);
      const completedBy = responses?.statementOfTruthCompletedBy;

      const sections = {
        claimantDetails: buildClaimantDetails(t, caseData),
        defendant1Details: buildDefendant1Details(t, caseData),
        additionalDefendantDetails: buildAdditionalDefendantDetails(t, caseData),
        responseToClaim: buildResponseToClaim(t, caseData),
        paymentsOrAgreements: buildPaymentsOrAgreements(t, caseData, dateIssued),
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
