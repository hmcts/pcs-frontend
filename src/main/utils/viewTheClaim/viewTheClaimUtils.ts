import escapeHTML from 'escape-html';
import type { TFunction } from 'i18next';
import { DateTime } from 'luxon';

import { GROUND_COLLECTION_PATHS, GROUND_LABELS, REASON_FIELDS, YES_NO_LABELS } from './viewTheClaimLabels';
import {
  buildActionTakenSection,
  buildAdditionalDefendantSections,
  buildAdditionalUnderlesseeSections,
  buildClaimDetailsSection,
  buildClaimPdfSection,
  buildClaimantCircumstancesSection,
  buildClaimantSection,
  buildDefendantCircumstancesSection,
  buildDefendantSection,
  buildDemotionSection,
  buildNoticeDetailsSection,
  buildProhibitedConductSection,
  buildRentArrearsSection,
  buildRequiredDocumentsSection,
  buildStatementOfTruthSection,
  buildSuspensionSection,
  buildTenancySection,
  buildUnderlesseeSection,
  buildUnderlesseeTriageSection,
  buildWelshAsbSection,
} from './viewTheClaimSections';

import type { CcdCaseAddress, CcdCaseData } from '@services/ccdCase.interface';
import { extractCaseDocuments } from '@utils/documentUtils';
import type { CaseDocumentLookupItem } from '@utils/documentUtils';

export interface ViewTheClaimSummaryRow {
  key: {
    text: string;
  };
  value: {
    text?: string;
    html?: string;
  };
  actions: {
    items: [];
  };
}

export interface ViewTheClaimSection {
  title: string;
  rows: ViewTheClaimSummaryRow[];
}

export interface ViewTheClaimDownloadSection {
  title: string;
  rows: ViewTheClaimSummaryRow[];
}

export interface ViewTheClaimPageData {
  caseReference: string;
  propertyAddressHtml?: string;
  propertyAddressText?: string;
  introText: string;
  pageMetadataRows: ViewTheClaimSummaryRow[];
  claimPdfSection: ViewTheClaimDownloadSection;
  sections: ViewTheClaimSection[];
  documentsUrl: string;
}

export type UnknownRecord = Record<string, unknown>;

interface CollectionRecord {
  id?: string;
  value: UnknownRecord;
}

export interface ViewTheClaimCopy {
  section: (key: string, options?: Record<string, unknown>) => string;
  label: (key: string, options?: Record<string, unknown>) => string;
  text: (key: string, options?: Record<string, unknown>) => string;
  personsUnknown: string;
  locale: string;
}

export function buildViewTheClaimPageData(
  caseReference: string,
  caseData: CcdCaseData,
  t: TFunction,
  language?: string
): ViewTheClaimPageData {
  const locale = toDateLocale(language);
  const copy = createViewTheClaimCopy(t, locale);
  const data = caseData as UnknownRecord;
  const documents = extractCaseDocuments(data);
  const propertyAddress = data.propertyAddress;
  const propertyAddressHtml = addressHtml(propertyAddress);
  const propertyAddressText = addressText(propertyAddress);
  const claimant = claimantName(data, copy);
  const claimIssueDateText = formatDate(
    getValue(data, 'claimIssueDate') ?? getValue(data, 'possessionClaimResponse.claimIssuedDate'),
    locale
  );
  const claimSubmittedDateText = formatDate(getValue(data, 'dateSubmitted'), locale);
  const pageMetadataRows = sectionRows([
    claimIssueDateText ? summaryRow(t('viewTheClaim:dateIssued'), { text: claimIssueDateText }) : undefined,
    claimSubmittedDateText ? summaryRow(t('viewTheClaim:dateSubmitted'), { text: claimSubmittedDateText }) : undefined,
  ]);

  const sections = [
    buildClaimantSection(data, copy),
    buildDefendantSection(data, propertyAddress, copy),
    ...buildAdditionalDefendantSections(data, propertyAddress, copy),
    buildClaimDetailsSection(data, propertyAddress, copy),
    buildWelshAsbSection(data, copy),
    buildRentArrearsSection(data, documents, caseReference, copy),
    buildActionTakenSection(data, copy),
    buildNoticeDetailsSection(data, documents, caseReference, copy),
    buildTenancySection(data, documents, caseReference, copy),
    buildClaimantCircumstancesSection(data, copy),
    buildDefendantCircumstancesSection(data, copy),
    buildUnderlesseeTriageSection(data, copy),
    buildUnderlesseeSection(data, propertyAddress, copy),
    ...buildAdditionalUnderlesseeSections(data, propertyAddress, copy),
    buildDemotionSection(data, copy),
    buildSuspensionSection(data, copy),
    buildProhibitedConductSection(data, copy),
    buildRequiredDocumentsSection(data, documents, caseReference, copy),
    buildStatementOfTruthSection(data, copy),
  ].filter((item): item is ViewTheClaimSection => !!item && item.rows.length > 0);

  return {
    caseReference,
    propertyAddressHtml,
    propertyAddressText,
    introText: claimant
      ? t('viewTheClaim:introText', {
          claimantName: claimant,
        })
      : t('viewTheClaim:introTextFallback'),
    pageMetadataRows,
    claimPdfSection: buildClaimPdfSection(documents, caseReference, copy),
    sections,
    documentsUrl: `/case/${caseReference}/view-documents`,
  };
}

function createViewTheClaimCopy(t: TFunction, locale: string): ViewTheClaimCopy {
  return {
    section: (key: string, options?: Record<string, unknown>) => t(`viewTheClaim:sections.${key}`, options),
    label: (key: string, options?: Record<string, unknown>) => t(`viewTheClaim:labels.${key}`, options),
    text: (key: string, options?: Record<string, unknown>) => t(`viewTheClaim:${key}`, options),
    personsUnknown: t('viewTheClaim:personsUnknown'),
    locale,
  };
}

/** Maps an application language code to the Luxon locale used for date formatting. */
export function toDateLocale(language?: string): string {
  return language?.toLowerCase() === 'cy' ? 'cy' : 'en-gb';
}

export function section(title: string, rows: (ViewTheClaimSummaryRow | undefined)[]): ViewTheClaimSection | undefined {
  const visibleRows = sectionRows(rows);
  return visibleRows.length > 0 ? { title, rows: visibleRows } : undefined;
}

export function sectionRows(rows: (ViewTheClaimSummaryRow | undefined)[]): ViewTheClaimSummaryRow[] {
  return rows.filter((row): row is ViewTheClaimSummaryRow => !!row);
}

export function summaryRow(label: string, value: { text: string } | { html: string }): ViewTheClaimSummaryRow {
  return {
    key: { text: label },
    value,
    actions: { items: [] },
  };
}

export function textRow(label: string, value: string | undefined): ViewTheClaimSummaryRow | undefined {
  return value ? summaryRow(label, { text: value }) : undefined;
}

export function htmlRow(label: string, value: string | undefined): ViewTheClaimSummaryRow | undefined {
  return value ? summaryRow(label, { html: value }) : undefined;
}

export function claimantName(data: UnknownRecord, copy: ViewTheClaimCopy): string | undefined {
  if (normaliseYesNo(getValue(data, 'isClaimantNameCorrect')) === 'NO') {
    return getFirstString(data, ['overriddenClaimantName', 'fallbackClaimantName', 'claimantName']);
  }

  return (
    listText(partyNames(collectionRecords(getValue(data, 'allClaimants')), copy)) ??
    getFirstString(data, [
      'claimantName',
      'fallbackClaimantName',
      'possessionClaimResponse.claimantOrganisations.0.value',
    ]) ??
    dynamicListLabel(getValue(data, 'claimantType'))
  );
}

export function claimantAddressHtml(data: UnknownRecord): string | undefined {
  const isCorrectAddressPaths = [
    'isCorrectClaimantContactAddress',
    'claimantContactPreferences.isCorrectClaimantContactAddress',
  ];
  const overriddenAddressPaths = [
    'overriddenClaimantContactAddress',
    'claimantContactPreferences.overriddenClaimantContactAddress',
  ];

  if (isCorrectAddressPaths.some(path => normaliseYesNo(getValue(data, path)) === 'NO')) {
    return getFirstAddressHtml(data, overriddenAddressPaths);
  }

  return (
    collectionAddressesHtml(collectionRecords(getValue(data, 'allClaimants'))) ??
    getFirstAddressHtml(
      data,
      [
        'possessionClaimResponse.claimantServiceAddress',
        'detailsTab_ClaimantAddress',
        'casePartiesTab_ClaimantDetails.serviceAddress',
        'organisationAddress',
        'claimantContactPreferences.organisationAddress',
      ]
    ) ??
    formattedAddressHtml(
      getFirstString(data, [
        'formattedClaimantContactAddress',
        'claimantContactPreferences.formattedClaimantContactAddress',
      ])
    )
  );
}

export function firstDefendantParty(data: UnknownRecord): UnknownRecord | undefined {
  const defendants = defendantParties(data);
  return defendants[0];
}

export function additionalDefendantParties(data: UnknownRecord): UnknownRecord[] {
  const defendantItems = collectionItems(getValue(data, 'allDefendants'));
  if (defendantItems.length > 0) {
    const currentDefendantId = getString(data, 'possessionClaimResponse.currentDefendantPartyId');
    const currentDefendant = asRecord(getValue(data, 'possessionClaimResponse.claimantEnteredDefendantDetails'));
    return defendantItems.slice(1).map(item => mergeCurrentParty(item, currentDefendantId, currentDefendant));
  }

  return collectionRecords(getValue(data, 'additionalDefendants'));
}

function defendantParties(data: UnknownRecord): UnknownRecord[] {
  const defendantItems = collectionItems(getValue(data, 'allDefendants'));
  if (defendantItems.length > 0) {
    const currentDefendantId = getString(data, 'possessionClaimResponse.currentDefendantPartyId');
    const currentDefendant = asRecord(getValue(data, 'possessionClaimResponse.claimantEnteredDefendantDetails'));
    return defendantItems.map(item => mergeCurrentParty(item, currentDefendantId, currentDefendant));
  }

  return [
    asRecord(getValue(data, 'defendant1')),
    asRecord(getValue(data, 'possessionClaimResponse.claimantEnteredDefendantDetails')),
  ].filter((party): party is UnknownRecord => !!party);
}

function mergeCurrentParty(
  partyItem: CollectionRecord,
  currentDefendantId: string | undefined,
  currentDefendant: UnknownRecord | undefined
): UnknownRecord {
  if (!currentDefendantId || partyItem.id !== currentDefendantId || !currentDefendant) {
    return partyItem.value;
  }

  return removeEmptyValues({
    ...partyItem.value,
    ...currentDefendant,
  });
}

export function firstUnderlesseeParty(data: UnknownRecord): UnknownRecord | undefined {
  const parties = underlesseeParties(data);
  return parties[0];
}

export function additionalUnderlesseeParties(data: UnknownRecord): UnknownRecord[] {
  const parties = collectionRecords(getValue(data, 'allUnderlesseeOrMortgagees'));
  if (parties.length > 0) {
    return parties.slice(1);
  }

  const draftParties = collectionRecords(getValue(data, 'additionalUnderlesseeOrMortgagee'));
  if (draftParties.length > 0) {
    return draftParties;
  }

  return collectionRecords(getValue(data, 'detailsTab_MortgageDetails'));
}

export function underlesseeParties(data: UnknownRecord): UnknownRecord[] {
  const parties = collectionRecords(getValue(data, 'allUnderlesseeOrMortgagees'));
  if (parties.length > 0) {
    return parties;
  }

  return [asRecord(getValue(data, 'underlesseeOrMortgagee1'))].filter((party): party is UnknownRecord => !!party);
}

export function partyName(party: UnknownRecord | undefined, copy: ViewTheClaimCopy): string | undefined {
  if (!party) {
    return undefined;
  }

  if (normaliseYesNo(party.nameKnown) === 'NO') {
    return copy.personsUnknown;
  }

  const firstName = getStringFromValue(party.firstName);
  const lastName = getStringFromValue(party.lastName);

  if (firstName === 'Person unknown' && lastName === 'Person unknown') {
    return copy.personsUnknown;
  }

  return [firstName, lastName].filter(Boolean).join(' ') || getStringFromValue(party.orgName);
}

export function underlesseeName(party: UnknownRecord | undefined, copy: ViewTheClaimCopy): string | undefined {
  if (!party) {
    return undefined;
  }

  if (normaliseYesNo(party.nameKnown) === 'NO') {
    return copy.personsUnknown;
  }

  return getStringFromValue(party.name) ?? partyName(party, copy) ?? copy.personsUnknown;
}

export function partyAddressHtml(party: UnknownRecord | undefined, propertyAddress: unknown): string | undefined {
  if (!party) {
    return undefined;
  }

  if (normaliseYesNo(party.addressKnown) === 'NO') {
    return '';
  }

  if (
    normaliseYesNo(party.addressSameAsPossession) === 'YES' ||
    normaliseYesNo(party.addressSameAsProperty) === 'YES'
  ) {
    return addressHtml(propertyAddress);
  }

  return (
    addressHtml(party.correspondenceAddress) ??
    addressHtml(party.address) ??
    addressHtml(party.addressForService) ??
    addressHtml(party.serviceAddress)
  );
}

export function groundLabels(data: UnknownRecord): string[] {
  const summaryLabels = getArray(getValue(data, 'claimGroundSummaries'))
    .map(item => asRecord(item))
    .map(item => asRecord(item?.value))
    .map(value => getStringFromValue(value?.label) ?? enumText(value?.code, GROUND_LABELS))
    .filter((value): value is string => !!value);

  if (summaryLabels.length > 0) {
    return unique(summaryLabels);
  }

  const labels = GROUND_COLLECTION_PATHS.flatMap(path =>
    getArray(getValue(data, path)).map(value => enumText(value, GROUND_LABELS))
  ).filter((value): value is string => !!value);

  return unique(labels);
}

export function groundReasonRows(data: UnknownRecord, copy: ViewTheClaimCopy): (ViewTheClaimSummaryRow | undefined)[] {
  const summaryRows = getArray(getValue(data, 'claimGroundSummaries'))
    .map(item => asRecord(item))
    .map(item => asRecord(item?.value))
    .filter((value): value is UnknownRecord => !!value)
    .map(value => {
      const label = getStringFromValue(value.label) ?? enumText(value.code, GROUND_LABELS) ?? '';
      const sectionNumber = label.match(/\(section ([^)]+)\)/i)?.[1];
      const reason =
        getStringFromValue(value.reason) ??
        (getStringFromValue(value.code)?.toUpperCase() === 'ANTISOCIAL_BEHAVIOUR_S157'
          ? getString(data, 'detailsTab_AntisocialAndConductDetails.antiSocialBehaviourDetails')
          : sectionNumber
            ? getString(data, `detailsTab_ReasonsForPossessionDetails.section${sectionNumber}`)
            : undefined);
      return textRow(copy.label('reasonForGround', { ground: label }), reason);
    })
    .filter((row): row is ViewTheClaimSummaryRow => !!row);

  if (summaryRows.length > 0) {
    return summaryRows;
  }

  return REASON_FIELDS.map(({ path, label }) =>
    textRow(copy.label('reasonForGround', { ground: copy.label(label) }), getString(data, path))
  );
}

export function otherGroundDescriptions(data: UnknownRecord): string[] {
  const summaryDescriptions = getArray(getValue(data, 'claimGroundSummaries'))
    .map(item => asRecord(item))
    .map(item => asRecord(item?.value))
    .filter((value): value is UnknownRecord => !!value)
    .filter(value => {
      const code = getStringFromValue(value.code)?.toUpperCase() ?? '';
      const label = getStringFromValue(value.label)?.toUpperCase() ?? '';
      return code.includes('OTHER') || label.includes('OTHER');
    })
    .map(value => getStringFromValue(value.description))
    .filter((value): value is string => !!value);

  const fallbackDescription = getFirstString(data, [
    'otherGroundsDescription',
    'introGrounds_DescriptionOfOtherGrounds',
  ]);

  return unique([...summaryDescriptions, ...(fallbackDescription ? [fallbackDescription] : [])]);
}

export function selectedAlternative(data: UnknownRecord, value: string): string | undefined {
  const alternatives = getArray(getValue(data, 'alternativesToPossession')).map(item =>
    String(item).trim().toUpperCase()
  );
  return alternatives.length > 0 ? (alternatives.includes(value) ? 'Yes' : 'No') : undefined;
}

export function documentLinksHtml(
  documents: CaseDocumentLookupItem[],
  caseReference: string,
  options: { documentTypes?: string[]; categoryIds?: string[]; filenameIncludes?: string[] }
): string | undefined {
  const documentTypes = new Set(options.documentTypes ?? []);
  const categoryIds = new Set(options.categoryIds ?? []);
  const filenameIncludes = (options.filenameIncludes ?? []).map(value => value.toLowerCase());

  const links = documents.filter(document => {
    const filename = document.filename.toLowerCase();
    return (
      (documentTypes.size > 0 && !!document.documentType && documentTypes.has(document.documentType)) ||
      (categoryIds.size > 0 && !!document.categoryId && categoryIds.has(document.categoryId)) ||
      (filenameIncludes.length > 0 && filenameIncludes.some(part => filename.includes(part)))
    );
  });

  return links.length > 0
    ? links
        .map(document => linkHtml(document.filename, `/case/${caseReference}/view-documents/${document.id}`))
        .join('<br>')
    : undefined;
}

export function linkHtml(text: string, href: string): string {
  return `<a class="govuk-link" href="${escapeHTML(href)}" target="_blank" rel="noopener noreferrer">${escapeHTML(text)}</a>`;
}

export function listHtml(values: string[]): string | undefined {
  return values.length > 0 ? values.map(value => escapeHTML(value)).join('<br>') : undefined;
}

export function addressHtml(value: unknown, options: { includeCountry?: boolean } = {}): string | undefined {
  const lines = addressLines(value, options);
  return lines.length > 0 ? lines.map(line => escapeHTML(line)).join('<br>') : undefined;
}

export function addressText(value: unknown, options: { includeCountry?: boolean } = {}): string | undefined {
  const lines = addressLines(value, options);
  return lines.length > 0 ? lines.join(', ') : undefined;
}

export function addressLines(value: unknown, { includeCountry = false }: { includeCountry?: boolean } = {}): string[] {
  const address = asRecord(value);
  if (!address) {
    return [];
  }

  const keys: (keyof CcdCaseAddress)[] = [
    'AddressLine1',
    'AddressLine2',
    'AddressLine3',
    'PostTown',
    'County',
    'PostCode',
  ];
  if (includeCountry) {
    keys.push('Country');
  }

  return keys.map(key => getStringFromValue(address[key])).filter((line): line is string => !!line);
}

export function formattedAddressHtml(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const lines = value
    .split(/<br\s*\/?>/i)
    .map(line => line.trim())
    .filter(Boolean);

  return lines.length > 0 ? lines.map(line => escapeHTML(line)).join('<br>') : undefined;
}

export function collectionAddressesHtml(parties: UnknownRecord[]): string | undefined {
  const addresses = parties.map(party => addressHtml(party.address)).filter((value): value is string => !!value);

  return addresses.length > 0 ? addresses.join('<br><br>') : undefined;
}

export function noticeDateTimeValue(data: UnknownRecord): unknown {
  return getFirstValue(data, [
    'notice_NoticeEmailSentDateTime',
    'notice_HandedOverDateTime',
    'notice_EmailSentDateTime',
    'notice_OtherElectronicDateTime',
    'notice_OtherDateTime',
  ]);
}

export function formatDate(value: unknown, locale = 'en-gb'): string | undefined {
  const text = getStringFromValue(value);
  if (!text) {
    return undefined;
  }

  const date = DateTime.fromISO(text, { zone: 'utc' });
  return date.isValid ? date.setZone('Europe/London').setLocale(locale).toFormat('d LLLL y') : text;
}

export function formatTime(value: unknown, locale = 'en-gb'): string | undefined {
  const text = getStringFromValue(value);
  if (!text || !text.includes('T')) {
    return undefined;
  }

  const date = DateTime.fromISO(text, { zone: 'utc' });
  return date.isValid ? date.setZone('Europe/London').setLocale(locale).toFormat('HH:mm') : undefined;
}

export function formatMoney(value: unknown): string | undefined {
  const text = getStringFromValue(value);
  if (!text) {
    return undefined;
  }

  const amount = Number(text);
  if (!Number.isFinite(amount)) {
    return text;
  }

  const pounds = text.includes('.') ? amount : amount / 100;
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(pounds);
}

export function yesNoText(value: unknown): string | undefined {
  const normalised = normaliseYesNo(value);
  return normalised ? (YES_NO_LABELS[normalised] ?? enumToSentence(normalised)) : undefined;
}

export function normaliseYesNo(value: unknown): string | undefined {
  const text = getStringFromValue(value);
  if (!text) {
    return undefined;
  }

  return text.toUpperCase().replace(/-/g, '_');
}

export function enumText(value: unknown, labels: Record<string, string>): string | undefined {
  const dynamicLabel = dynamicListLabel(value);
  if (dynamicLabel) {
    return dynamicLabel;
  }

  const text = getStringFromValue(value);
  if (!text) {
    return undefined;
  }

  const key = text.toUpperCase();
  return labels[key] ?? enumToSentence(text);
}

export function dynamicListLabel(value: unknown): string | undefined {
  const record = asRecord(value);
  const nestedValue = asRecord(record?.value);
  return (
    getStringFromValue(nestedValue?.label) ?? getStringFromValue(record?.label) ?? getStringFromValue(record?.valueCode)
  );
}

export function enumToSentence(value: string): string {
  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/^\w/, char => char.toUpperCase());
}

export function getFirstAddressHtml(
  data: UnknownRecord,
  paths: string[],
  options: { includeCountry?: boolean } = {}
): string | undefined {
  return paths.map(path => addressHtml(getValue(data, path), options)).find(Boolean);
}

export function getFirstPartyName(data: UnknownRecord, paths: string[], copy: ViewTheClaimCopy): string | undefined {
  return paths.map(path => partyName(asRecord(getValue(data, path)), copy)).find(Boolean);
}

export function getFirstString(data: UnknownRecord, paths: string[]): string | undefined {
  return paths.map(path => getString(data, path)).find(Boolean);
}

export function getString(data: UnknownRecord, path: string): string | undefined {
  return getStringFromValue(getValue(data, path));
}

export function getFirstValue(data: UnknownRecord, paths: string[]): unknown {
  return paths.map(path => getValue(data, path)).find(hasCapturedValue);
}

export function getValue(data: UnknownRecord, path: string): unknown {
  return path.split('.').reduce<unknown>((current, segment) => {
    if (Array.isArray(current)) {
      const index = Number(segment);
      return Number.isInteger(index) ? current[index] : undefined;
    }

    const record = asRecord(current);
    return record ? record[segment] : undefined;
  }, data);
}

export function hasCapturedValue(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (typeof value === 'string') {
    return value.trim().length > 0;
  }

  return value !== undefined && value !== null;
}

export function getStringFromValue(value: unknown): string | undefined {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return undefined;
  }

  const text = String(value).trim();
  return text || undefined;
}

export function asRecord(value: unknown): UnknownRecord | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as UnknownRecord) : undefined;
}

export function getArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function collectionRecords(value: unknown): UnknownRecord[] {
  return collectionItems(value).map(item => item.value);
}

export function collectionItems(value: unknown): CollectionRecord[] {
  return getArray(value).flatMap(item => {
    const record = asRecord(item);
    const recordValue = asRecord(record?.value);
    if (!recordValue) {
      return [];
    }

    return [
      {
        id: getStringFromValue(record?.id),
        value: recordValue,
      },
    ];
  });
}

export function unique(values: string[]): string[] {
  return [...new Set(values)];
}

export function partyNames(parties: UnknownRecord[], copy: ViewTheClaimCopy): string[] {
  return parties.map(party => partyName(party, copy)).filter((name): name is string => !!name);
}

export function listText(values: string[]): string | undefined {
  return values.length > 0 ? values.join(', ') : undefined;
}

export function removeEmptyValues(value: UnknownRecord): UnknownRecord {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => hasCapturedValue(item)));
}
