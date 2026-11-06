import escapeHtml from 'escape-html';
import type { Request } from 'express';
import type { TFunction } from 'i18next';

import { formatCcdAddressLines } from '../utils/ccdAddress';

import { readClaim } from './claimDraft';
import { propertyAddressOf } from './claimMapping';
import { usesLedger, usesTable } from './conditions';
import { formatClaimDate } from './dates';
import { flowConfig } from './flow.config';
import { formatPence } from './rentHistory';
import { ledgerTable, rentStatementTable } from './rentTables';

import { getTranslationFunction } from '@modules/steps';
import { getStepUrl } from '@modules/steps/flow';
import type { CcdCaseAddress } from '@services/ccdCase.interface';
import {
  type CitizenDefendant,
  type ClaimDocuments,
  NOTICE_METHOD_DETAILS,
  type YesNo,
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
        `${getStepUrl('remove-defendant', flowConfig, req.res?.locals.validatedCase?.id)}?index=${index}`,
        t('makeAClaim:summary.remove'),
        t('makeAClaim:summary.labels.defendantName', number) + ` ${name}`
      );
    }
  });
  builder.add('additional-defendants', 'additionalDefendants', yesNo(t, claim.additionalDefendants));
  return { id: 'defendants', title: t('makeAClaim:summary.cards.defendants'), rows: builder.build() };
}

export function tenancyCard(req: Request): SummaryCard {
  const t = getTranslationFunction(req, ['makeAClaim', 'common']);
  const { tenancy = {}, grounds = {} } = readClaim(req);
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
    .add('rent-arrears-claim', 'hasRentArrearsGrounds', yesNo(t, grounds.hasRentArrearsGrounds))
    .add(
      'rent-arrears-grounds',
      'rentArrearsGrounds',
      (grounds.rentArrearsGrounds ?? []).map(g => t(`makeAClaim:grounds.${g}`))
    )
    .add('other-grounds-claim', 'hasOtherGrounds', yesNo(t, grounds.hasOtherGrounds))
    .add('other-grounds', 'otherGrounds', [
      ...(grounds.otherGrounds ?? []).map(g => t(`makeAClaim:grounds.${g}`)),
      ...(grounds.otherGroundsDetails ? [grounds.otherGroundsDetails] : []),
    ]);
  if (isStepShown(req, 'ground-reason')) {
    for (const ground of groundsNeedingReasons(grounds)) {
      const label = t('makeAClaim:summary.labels.groundReason', { ground: t(`makeAClaim:grounds.${ground}`) });
      const reason = grounds.groundReasons?.find(item => item.value.ground === ground)?.value.reason;
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
    .add('notice-date', 'noticeDate', formatClaimDate(notice.noticeDate, req))
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
    .add('rent-due-day', 'rentDueDay', rentArrears.rentDueDay?.toString())
    .add('arrears-at-notice', 'arrearsAtNoticeDate', money(rentArrears.arrearsAtNoticeDate))
    .add('current-arrears', 'currentArrears', money(rentArrears.currentArrears))
    .add('arrears-proof', 'proofType', valueOf(t, 'proofType', rentArrears.proofType))
    .add('upload-rent-statement', 'rentStatementDocuments', documents(rentArrears.rentStatementDocuments))
    .add('money-judgment', 'moneyJudgmentWanted', yesNo(t, rentArrears.moneyJudgmentWanted))
    .add('recovery-steps', 'recoverySteps', rentArrears.recoverySteps)
    .build();
  const caseId = req.res?.locals.validatedCase?.id;
  const card: SummaryCard = { id: 'rentArrears', title: t('makeAClaim:summary.cards.rentArrears'), rows };
  if (usesLedger(req) && rentArrears.rentHistoryLedger?.length) {
    card.table = ledgerTable(req, false);
    card.tableChange = {
      href: getStepUrl('ledger-summary', flowConfig, caseId),
      text: t('makeAClaim:summary.changeStatement'),
    };
  } else if (usesTable(req) && rentArrears.rentHistoryTable?.length) {
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
    .add('underlessee', 'underlesseeExists', yesNo(t, circumstances.underlesseeExists))
    .add('underlessee-name', 'underlesseeName', circumstances.underlesseeName)
    .add('underlessee-address', 'underlesseeAddress', address(circumstances.underlesseeAddress))
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

/** The property, which cannot be changed once the claim exists. */
export function propertyCard(req: Request): SummaryCard {
  const t = getTranslationFunction(req, ['makeAClaim', 'common']);
  const lines = address(propertyAddressOf(req)).map(line => escapeHtml(line));
  return {
    id: 'property',
    title: t('makeAClaim:summary.cards.property'),
    rows: [
      {
        key: { text: t('makeAClaim:summary.labels.propertyAddress') },
        value: {
          html: `${lines.join('<br>')}<p class="govuk-hint govuk-!-margin-top-2 govuk-!-margin-bottom-0">${escapeHtml(
            t('makeAClaim:summary.propertyCannotChange')
          )}</p>`,
        },
      },
    ],
  };
}

/** Every card the final check your answers page shows, in journey order. */
export function allCards(req: Request): SummaryCard[] {
  const cards = [propertyCard(req), aboutYouCard(req), defendantsCard(req), tenancyCard(req), noticeCard(req)];
  if (readClaim(req).grounds?.hasRentArrearsGrounds === 'YES') {
    cards.push(rentArrearsCard(req));
  }
  cards.push(circumstancesCard(req), otherInformationCard(req));
  return cards;
}
