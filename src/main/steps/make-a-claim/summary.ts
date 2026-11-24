import escapeHtml from 'escape-html';
import type { Request } from 'express';
import type { TFunction } from 'i18next';

import { formatCcdAddressLines } from '../utils/ccdAddress';

import { readClaim } from './claimDraft';
import { propertyAddressOf } from './claimMapping';
import { usesTable } from './conditions';
import { formatClaimDate } from './dates';
import { flowConfig } from './flow.config';
import { formatPence } from './rentHistory';
import { rentStatementTable } from './rentTables';

import { getTranslationFunction } from '@modules/steps';
import { getStepUrl } from '@modules/steps/flow';
import type { CcdCaseAddress } from '@services/ccdCase.interface';
import {
  type CitizenDefendant,
  type ClaimDocuments,
  NOTICE_METHOD_DETAILS,
  OTHER_GROUND,
  type YesNo,
  claimsRentArrears,
  groundReasonsOf,
  groundsNeedingReasons,
} from '@services/citizenPossessionClaim.interface';

export interface SummaryRow {
  key: { text: string };
  value: { text?: string; html?: string };
  actions?: { items: { href: string; text: string; visuallyHiddenText: string }[] };
}

export interface SummaryCard {
  id: string;
  title: string;
  rows: SummaryRow[];
  table?: Record<string, unknown>;
  tableChange?: { href: string; text: string };
}

export function defendantDisplayName(defendant: CitizenDefendant | undefined, req: Request): string {
  const t = getTranslationFunction(req, ['makeAClaim', 'common']);
  if (defendant?.nameKnown === 'YES' && (defendant.firstName || defendant.lastName)) {
    return [defendant.firstName, defendant.lastName].filter(Boolean).join(' ');
  }
  return t('makeAClaim:summary.personsUnknown');
}

function isStepShown(req: Request, stepName: string): boolean {
  const showCondition = flowConfig.steps[stepName]?.showCondition;
  return !showCondition || showCondition(req);
}

function linesHtml(lines: string[]): string {
  return lines.map(line => escapeHtml(line)).join('<br>');
}

class CardBuilder {
  private readonly rows: SummaryRow[] = [];

  constructor(
    private readonly req: Request,
    private readonly t: TFunction
  ) {}

  /** Adds a row for an answer given on `stepName`, unless the claimant was not asked that question. */
  add(stepName: string, labelKey: string, value: string | string[] | undefined, query = '', label?: string): this {
    if (!isStepShown(this.req, stepName) && !query) {
      return this;
    }
    const text = label ?? this.t(`makeAClaim:summary.labels.${labelKey}`);
    const empty = this.t('makeAClaim:summary.notAnswered');
    const href = `${getStepUrl(stepName, flowConfig, this.req.res?.locals.validatedCase?.id)}${query}`;
    this.rows.push({
      key: { text },
      value: Array.isArray(value) ? { html: value.length ? linesHtml(value) : empty } : { text: value || empty },
      actions: { items: [{ href, text: this.t('makeAClaim:summary.change'), visuallyHiddenText: text }] },
    });
    return this;
  }

  /** Adds another action, such as Remove, to the row added last. */
  withAction(href: string, text: string, visuallyHiddenText: string): this {
    this.rows[this.rows.length - 1]?.actions?.items.push({ href, text, visuallyHiddenText });
    return this;
  }

  build(): SummaryRow[] {
    return this.rows;
  }
}

function yesNo(t: TFunction, value: YesNo | undefined): string | undefined {
  return value ? t(`makeAClaim:options.${value === 'YES' ? 'yes' : 'no'}`) : undefined;
}

function withDetail(answer: string | undefined, detail: string | undefined): string | string[] | undefined {
  return answer && detail ? [answer, detail] : answer;
}

function valueOf(t: TFunction, group: string, value: string | undefined): string | undefined {
  return value ? t(`makeAClaim:values.${group}.${value}`) : undefined;
}

function address(value: CcdCaseAddress | undefined): string[] {
  return formatCcdAddressLines(value);
}

function documents(value: ClaimDocuments | undefined): string[] {
  return (value ?? []).map(item => item.value.document_filename);
}

function money(value: string | undefined): string | undefined {
  return value ? formatPence(value) : undefined;
}

export function aboutYouCard(req: Request): SummaryCard {
  const t = getTranslationFunction(req, ['makeAClaim', 'common']);
  const claimant = readClaim(req).claimant ?? {};
  const rows = new CardBuilder(req, t)
    .add(
      'individual-or-organisation',
      'individualOrOrganisation',
      valueOf(t, 'individualOrOrganisation', claimant.individualOrOrganisation)
    )
    .add('claimant-name', 'claimantName', [claimant.firstName, claimant.lastName].filter(Boolean).join(' '))
    .add('organisation-name', 'organisationName', claimant.organisationName)
    .add('claimant-address', 'claimantAddress', address(claimant.address))
    .add('claimant-email', 'emailAddress', claimant.emailAddress)
    .add(
      'claimant-phone',
      'contactByPhone',
      claimant.contactByPhone === 'YES'
        ? [yesNo(t, 'YES') ?? '', claimant.phoneNumber ?? '']
        : yesNo(t, claimant.contactByPhone)
    )
    .add(
      'claimant-text-message',
      'contactByText',
      claimant.textMessageNumber
        ? [yesNo(t, claimant.contactByText) ?? '', claimant.textMessageNumber]
        : yesNo(t, claimant.contactByText)
    )
    .add('multiple-claimants', 'multipleClaimants', yesNo(t, claimant.multipleClaimants))
    .build();
  return { id: 'aboutYou', title: t('makeAClaim:summary.cards.aboutYou'), rows };
}

/** One card for each claimant added after the first, with the answers asked for them. */
export function additionalClaimantCards(req: Request): SummaryCard[] {
  const t = getTranslationFunction(req, ['makeAClaim', 'common']);
  return (readClaim(req).additionalClaimants ?? []).map((item, index) => {
    const claimant = item.value;
    const query = `?index=${index}`;
    const builder = new CardBuilder(req, t).add(
      'additional-claimant-type',
      'additionalClaimantType',
      valueOf(t, 'individualOrOrganisation', claimant.individualOrOrganisation),
      query
    );
    if (claimant.individualOrOrganisation === 'INDIVIDUAL') {
      builder.add(
        'additional-claimant-name',
        'additionalClaimantName',
        [claimant.firstName, claimant.lastName].filter(Boolean).join(' '),
        query
      );
    } else if (claimant.individualOrOrganisation === 'ORGANISATION') {
      builder.add(
        'additional-claimant-organisation-name',
        'additionalClaimantOrganisationName',
        claimant.organisationName,
        query
      );
    }
    const rows = builder
      .add('additional-claimant-address', 'additionalClaimantAddress', address(claimant.address), query)
      .add(
        'additional-claimant-email',
        'additionalClaimantEmail',
        claimant.emailAddress === '' ? t('makeAClaim:summary.notProvided') : claimant.emailAddress,
        query
      )
      .add(
        'additional-claimant-phone',
        'additionalClaimantPhone',
        claimant.contactByPhone === 'YES'
          ? [yesNo(t, 'YES') ?? '', claimant.phoneNumber ?? '']
          : yesNo(t, claimant.contactByPhone),
        query
      )
      .add(
        'additional-claimant-text-message',
        'additionalClaimantTextMessage',
        claimant.contactByText === 'YES'
          ? [yesNo(t, 'YES') ?? '', claimant.textMessageNumber ?? '']
          : yesNo(t, claimant.contactByText),
        query
      )
      .build();
    return {
      id: `additionalClaimant${index + 1}`,
      title: t('makeAClaim:summary.cards.additionalClaimant', { number: index + 1 }),
      rows,
    };
  });
}

export function defendantsCard(req: Request): SummaryCard {
  const t = getTranslationFunction(req, ['makeAClaim', 'common']);
  const claim = readClaim(req);
  const builder = new CardBuilder(req, t);
  (claim.defendants ?? []).forEach((defendant, index) => {
    const query = index > 0 ? `?index=${index}` : '';
    const number = { number: index + 1 };
    builder
      .add(
        'defendant-name',
        'defendantName',
        defendantDisplayName(defendant.value, req),
        query,
        t('makeAClaim:summary.labels.defendantName', number)
      )
      .add(
        'defendant-address',
        'defendantAddress',
        address(defendant.value.addressSameAsProperty === 'YES' ? propertyAddressOf(req) : defendant.value.address),
        query,
        t('makeAClaim:summary.labels.defendantAddress', number)
      );
    if (index > 0) {
      const name = defendantDisplayName(defendant.value, req);
      builder.withAction(
        `${getStepUrl('remove-defendant', flowConfig, req.res?.locals.validatedCase?.id)}?${defendant.id ? `id=${defendant.id}` : `index=${index}`}`,
        t('makeAClaim:summary.remove'),
        t('makeAClaim:summary.labels.defendantName', number) + ` ${name}`
      );
    }
  });
  return { id: 'defendants', title: t('makeAClaim:summary.cards.defendants'), rows: builder.build() };
}

export function tenancyCard(req: Request): SummaryCard {
  const t = getTranslationFunction(req, ['makeAClaim', 'common']);
  const claim = readClaim(req);
  const { tenancy = {}, grounds = {} } = claim;
  const builder = new CardBuilder(req, t)
    .add(
      'tenancy-type',
      'tenancyType',
      tenancy.tenancyType === 'OTHER'
        ? [valueOf(t, 'tenancyType', 'OTHER') ?? '', tenancy.otherTenancyTypeDetails ?? '']
        : valueOf(t, 'tenancyType', tenancy.tenancyType)
    )
    .add('tenancy-start-date', 'tenancyStartDate', formatClaimDate(tenancy.tenancyStartDate, req))
    .add(
      'tenancy-agreement',
      'tenancyAgreementAvailable',
      withDetail(yesNo(t, tenancy.tenancyAgreementAvailable), tenancy.noTenancyAgreementReason)
    )
    .add('upload-tenancy-agreement', 'tenancyAgreementDocuments', documents(tenancy.tenancyAgreementDocuments))
    .add(
      'occupation-contract-type',
      'occupationContractType',
      tenancy.occupationContractType === 'OTHER'
        ? [valueOf(t, 'occupationContractType', 'OTHER') ?? '', tenancy.otherOccupationContractDetails ?? '']
        : valueOf(t, 'occupationContractType', tenancy.occupationContractType)
    )
    .add(
      'occupation-contract-start-date',
      'occupationContractStartDate',
      formatClaimDate(tenancy.tenancyStartDate, req)
    )
    .add(
      'occupation-contract-agreement',
      'occupationContractAgreementAvailable',
      withDetail(yesNo(t, tenancy.tenancyAgreementAvailable), tenancy.noTenancyAgreementReason)
    )
    .add('upload-occupation-contract', 'occupationContractDocuments', documents(tenancy.tenancyAgreementDocuments))
    .add(
      'epc-available',
      'hasEnergyPerformanceCertificate',
      withDetail(yesNo(t, tenancy.hasEnergyPerformanceCertificate), tenancy.noEnergyPerformanceCertificateReason)
    )
    .add('upload-epc', 'energyPerformanceDocuments', documents(tenancy.energyPerformanceDocuments))
    .add(
      'gas-safety-available',
      'hasGasSafetyReport',
      withDetail(yesNo(t, tenancy.hasGasSafetyReport), tenancy.noGasSafetyReportReason)
    )
    .add('upload-gas-safety', 'gasSafetyReportDocuments', documents(tenancy.gasSafetyReportDocuments))
    .add(
      'eicr-available',
      'hasElectricalInstallationConditionReport',
      withDetail(
        yesNo(t, tenancy.hasElectricalInstallationConditionReport),
        tenancy.noElectricalInstallationConditionReason
      )
    )
    .add('upload-eicr', 'electricalInstallationDocuments', documents(tenancy.electricalInstallationDocuments))
    .add('excluded-grounds-claim', 'hasExcludedGrounds', yesNo(t, grounds.hasExcludedGrounds))
    .add('excluded-grounds', 'excludedGrounds', [
      ...(grounds.excludedGrounds ?? []).map(g => t(`makeAClaim:summary.values.excludedGround.${g}`)),
      ...(grounds.excludedOtherGroundDetails ? [grounds.excludedOtherGroundDetails] : []),
    ])
    .add('excluded-reason', 'excludedReason', grounds.excludedReason)
    .add('rent-arrears-claim', 'hasRentArrearsGrounds', yesNo(t, grounds.hasRentArrearsGrounds))
    .add(
      'rent-arrears-grounds',
      'rentArrearsGrounds',
      (grounds.rentArrearsGrounds ?? []).map(g => t(`makeAClaim:grounds.${g}`))
    )
    .add('other-grounds-claim', 'hasOtherGrounds', yesNo(t, grounds.hasOtherGrounds))
    .add('wales-grounds', 'walesGrounds', [
      ...[...(grounds.walesDiscretionaryGrounds ?? []), ...(grounds.walesMandatoryGrounds ?? [])].map(g =>
        t(`makeAClaim:grounds.${g}`)
      ),
      ...(grounds.otherGrounds?.includes(OTHER_GROUND)
        ? [t('makeAClaim:grounds.WALES_OTHER'), grounds.otherGroundsDetails ?? '']
        : []),
    ])
    .add('other-grounds', 'otherGrounds', [
      ...(grounds.otherGrounds ?? []).map(g => t(`makeAClaim:grounds.${g}`)),
      ...(grounds.otherGroundsDetails ? [grounds.otherGroundsDetails] : []),
    ]);
  if (isStepShown(req, 'ground-reason')) {
    for (const ground of groundsNeedingReasons(claim)) {
      const label = t('makeAClaim:summary.labels.groundReason', { ground: t(`makeAClaim:grounds.${ground}`) });
      const reason = groundReasonsOf(claim).find(item => item.value.ground === ground)?.value.reason;
      builder.add('ground-reason', 'groundReason', reason, `?ground=${ground}`, label);
    }
  }
  const rows = builder.build();
  return { id: 'tenancy', title: t('makeAClaim:summary.cards.tenancy'), rows };
}

export function noticeCard(req: Request): SummaryCard {
  const t = getTranslationFunction(req, ['makeAClaim', 'common']);
  const notice = readClaim(req).notice ?? {};
  const details = notice as Record<string, string | undefined>;
  const methods = (notice.noticeMethods ?? []).flatMap(method => {
    const { date, details: detail } = NOTICE_METHOD_DETAILS[method];
    return [
      valueOf(t, 'noticeMethod', method) ?? '',
      ...(detail && details[detail] ? [details[detail] as string] : []),
      formatClaimDate(details[date], req),
    ].filter(Boolean);
  });
  const rows = new CardBuilder(req, t)
    .add('notice-served', 'noticeServed', withDetail(yesNo(t, notice.noticeServed), notice.noNoticeReason))
    .add(
      'notice-type',
      'noticeType',
      notice.noticeType === 'OTHER'
        ? [valueOf(t, 'noticeType', 'OTHER') ?? '', notice.noticeTypeOther ?? '']
        : valueOf(t, 'noticeType', notice.noticeType)
    )
    .add('notice-method', 'noticeMethods', methods)
    .add(
      'notice-available',
      'noticeAvailable',
      withDetail(yesNo(t, notice.noticeAvailable), notice.noticeUnavailableReason)
    )
    .add('upload-notice', 'noticeDocuments', documents(notice.noticeDocuments))
    .build();
  return { id: 'notice', title: t('makeAClaim:summary.cards.notice'), rows };
}

export function rentArrearsCard(req: Request): SummaryCard {
  const t = getTranslationFunction(req, ['makeAClaim', 'common']);
  const rentArrears = readClaim(req).rentArrears ?? {};
  const rows = new CardBuilder(req, t)
    .add('rent-amount', 'rentAmount', money(rentArrears.rentAmount))
    .add(
      'rent-frequency',
      'rentFrequency',
      rentArrears.rentFrequency === 'OTHER'
        ? [valueOf(t, 'rentFrequency', 'OTHER') ?? '', rentArrears.otherFrequencyDetails ?? '']
        : valueOf(t, 'rentFrequency', rentArrears.rentFrequency)
    )
    .add('arrears-at-notice', 'arrearsAtNoticeDate', money(rentArrears.arrearsAtNoticeDate))
    .add('current-arrears', 'currentArrears', money(rentArrears.currentArrears))
    .add('arrears-proof', 'proofType', valueOf(t, 'proofType', rentArrears.proofType))
    .add('upload-rent-statement', 'rentStatementDocuments', documents(rentArrears.rentStatementDocuments))
    .add('rent-due-day', 'rentDueDay', rentArrears.rentDueDay?.toString())
    .add('money-judgment', 'moneyJudgmentWanted', yesNo(t, rentArrears.moneyJudgmentWanted))
    .add('recovery-steps', 'recoverySteps', rentArrears.recoverySteps)
    .build();
  const caseId = req.res?.locals.validatedCase?.id;
  const card: SummaryCard = { id: 'rentArrears', title: t('makeAClaim:summary.cards.rentArrears'), rows };
  if (usesTable(req) && rentArrears.rentHistoryTable?.length) {
    card.table = rentStatementTable(req, false);
    card.tableChange = {
      href: getStepUrl('rent-statement', flowConfig, caseId),
      text: t('makeAClaim:summary.changeStatement'),
    };
  }
  return card;
}

export function circumstancesCard(req: Request): SummaryCard {
  const t = getTranslationFunction(req, ['makeAClaim', 'common']);
  const circumstances = readClaim(req).circumstances ?? {};
  const rows = new CardBuilder(req, t)
    .add('defendant-circumstances', 'defendantCircumstances', circumstances.defendantCircumstances)
    .add('claimant-circumstances', 'claimantCircumstances', circumstances.claimantCircumstances)
    .build();
  return { id: 'circumstances', title: t('makeAClaim:summary.cards.circumstances'), rows };
}

export function otherInformationCard(req: Request): SummaryCard {
  const t = getTranslationFunction(req, ['makeAClaim', 'common']);
  const otherInformation = readClaim(req).otherInformation ?? {};
  const rows = new CardBuilder(req, t)
    .add('upload-other-documents', 'otherDocuments', documents(otherInformation.otherDocuments))
    .add(
      'other-reasons',
      'hasOtherReasons',
      otherInformation.hasOtherReasons === 'YES'
        ? [yesNo(t, 'YES') ?? '', otherInformation.otherReasonsDetail ?? '']
        : yesNo(t, otherInformation.hasOtherReasons)
    )
    .add('general-application', 'generalApplicationIntent', yesNo(t, otherInformation.generalApplicationIntent))
    .add('language-used', 'languageUsed', valueOf(t, 'languageUsed', otherInformation.languageUsed))
    .build();
  return { id: 'otherInformation', title: t('makeAClaim:summary.cards.otherInformation'), rows };
}

/** The support the claimant asked for through Your Support, one line for each request. */
export function supportCard(req: Request): SummaryCard {
  const t = getTranslationFunction(req, ['makeAClaim', 'common']);
  const requests = (readClaim(req).otherInformation?.supportFlags?.details ?? [])
    .map(detail => detail.value)
    .filter(flag => flag.status?.toLowerCase() !== 'inactive')
    .map(flag => flag.subTypeValue || flag.name);
  const rows = new CardBuilder(req, t)
    .add('your-support', 'supportRequests', requests.length ? requests : [t('makeAClaim:summary.noSupportRequested')])
    .build();
  return { id: 'yourSupport', title: t('makeAClaim:summary.cards.yourSupport'), rows };
}

/** Whether the claimant answered the equality and diversity questions, which pcs-api never shows them back. */
export function equalityCard(req: Request): SummaryCard {
  const t = getTranslationFunction(req, ['makeAClaim', 'common']);
  const answered = readClaim(req).otherInformation?.equalityQuestionsChoice === 'CONTINUE';
  const rows = new CardBuilder(req, t)
    .add(
      'equality-and-diversity',
      'equalityQuestions',
      t(`makeAClaim:summary.${answered ? 'provided' : 'notProvided'}`)
    )
    .build();
  return { id: 'equality', title: t('makeAClaim:summary.cards.equality'), rows };
}

/** The property, which cannot be changed once the claim exists. */
export function propertyCard(req: Request): SummaryCard {
  const t = getTranslationFunction(req, ['makeAClaim', 'common']);

  return {
    id: 'property',
    title: t('makeAClaim:summary.cards.property'),
    rows: [
      {
        key: { text: t('makeAClaim:summary.labels.propertyAddress') },
        value: {
          html: `${linesHtml(address(propertyAddressOf(req)))}<p class="govuk-hint govuk-!-margin-top-2 govuk-!-margin-bottom-0">${escapeHtml(
            t('makeAClaim:summary.propertyCannotChange')
          )}</p>`,
        },
      },
    ],
  };
}

/** Every card the final check your answers page shows, in journey order. */
export function allCards(req: Request): SummaryCard[] {
  const cards = [
    propertyCard(req),
    aboutYouCard(req),
    ...additionalClaimantCards(req),
    defendantsCard(req),
    tenancyCard(req),
    noticeCard(req),
  ];
  if (claimsRentArrears(readClaim(req))) {
    cards.push(rentArrearsCard(req));
  }
  cards.push(circumstancesCard(req), otherInformationCard(req), supportCard(req), equalityCard(req));
  return cards;
}
