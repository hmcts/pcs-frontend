import { DateTime } from 'luxon';

import { parseDate, parseMoney } from '@utils/makeOrderFormat';
import type { AttendanceParty, MakeOrderType } from '@utils/makeOrderValidation';
import type {
  FormData,
  OrderApplication,
  OrderCaseBundle,
  OrderHearing,
  OrderParty,
  OrderStart,
} from '@utils/orderCase';

const DEFAULT_ORDER_TYPE: MakeOrderType = 'OUTRIGHT_POSSESSION';
const APPLICATION_ORDER_TYPE: MakeOrderType = 'APPLICATION_DECISION';
const ON_PAPER_ORDER_TYPE: MakeOrderType = 'ON_PAPER';

const YES_NO: Record<string, string> = { YES: 'Yes', NO: 'No' };

function displayDate(iso?: string | null): string | undefined {
  const date = DateTime.fromISO(String(iso ?? ''), { zone: 'Europe/London' });
  return date.isValid ? date.setLocale('en-GB').toFormat('d MMMM yyyy') : undefined;
}

/**
 * The wording the applicant asked for, which the judge can choose to use: what they wrote in the application,
 * then each draft order they filed whose wording pcs-api could read.
 */
function wordingSources(application: OrderApplication) {
  return [
    ...(application.whatOrderWanted
      ? [{ id: 'requested', label: 'Wording in the application', wording: application.whatOrderWanted }]
      : []),
    ...(application.draftOrders ?? [])
      .filter(draft => draft.wording)
      .map(draft => ({ id: draft.id, label: `Draft order: ${draft.fileName}`, wording: draft.wording! })),
  ];
}

/** The application as its panel shows it: its answers in words, and its dates as the court writes them. */
function applicationModel(application: OrderApplication, caseReference: number) {
  const href = (id: string): string => `/case/${caseReference}/view-documents/${encodeURIComponent(id)}`;
  return {
    ...application,
    documents: application.documents.map(document => ({ ...document, href: href(document.id) })),
    draftOrders: (application.draftOrders ?? []).map(draft => ({ ...draft, href: href(draft.id) })),
    wordingSources: wordingSources(application),
    submittedOnDisplay: displayDate(application.submittedOn),
    referredOnDisplay: displayDate(application.referredOn),
    within14DaysDisplay: YES_NO[application.within14Days ?? ''],
    otherPartiesAgreedDisplay: YES_NO[application.otherPartiesAgreed ?? ''],
    withoutNoticeDisplay: YES_NO[application.withoutNotice ?? ''],
  };
}

/** The whole file download linked from the order page, with when it was last brought up to date. */
function caseBundleModel(bundle: OrderCaseBundle, caseReference: number) {
  const updated = DateTime.fromISO(String(bundle.updatedAt ?? ''));
  return {
    ...bundle,
    href: `/case/${caseReference}/view-documents/${encodeURIComponent(bundle.id)}`,
    updatedDisplay: updated.isValid
      ? updated
          .setZone('Europe/London')
          .setLocale('en-GB')
          .toFormat("d MMMM yyyy 'at' h:mma")
          .replace(/AM|PM/, m => m.toLowerCase())
      : undefined,
  };
}

// The case facts as pcs-api names them, against the form's fields.
const FACT_FIELDS: Record<string, string> = {
  tenancyType: 'tenancy-type',
  currentRent: 'current-rent',
  rentFrequency: 'rent-frequency',
  groundsPleaded: 'grounds-pleaded',
  arrearsAtNotice: 'arrears-notice',
  arrearsAtIssue: 'arrears-issue',
  lastPayment: 'last-payment',
  arrearsToday: 'arrears-today',
};
const MONEY_FACTS = new Set(['currentRent', 'arrearsAtNotice', 'arrearsAtIssue', 'lastPayment', 'arrearsToday']);
const DATE_FACTS: Record<string, string> = {
  tenancyStartDate: 'date-tenancy',
  noticeDate: 'date-notice',
  lastPaymentDate: 'date-last-payment',
};

/** The case facts panel's fields: the hearing's record, which is never part of the order. */
const HEARING_RECORD_FIELDS = new Set([
  ...Object.values(FACT_FIELDS),
  ...Object.values(DATE_FACTS).flatMap(field => ['day', 'month', 'year'].map(part => `${field}-${part}`)),
  'hearing-notes',
]);

/** The order's answers, without the hearing's facts and note. */
export function withoutHearingRecord(formData: FormData): FormData {
  return Object.fromEntries(Object.entries(formData).filter(([field]) => !HEARING_RECORD_FIELDS.has(field)));
}

/** Pre-fills the case facts fields, in the form's field names. */
function caseFactsFormData(caseFacts: Record<string, unknown> = {}): FormData {
  const formData: FormData = {};
  for (const [fact, field] of Object.entries(FACT_FIELDS)) {
    if (caseFacts[fact] !== undefined && caseFacts[fact] !== null) {
      formData[field] = String(caseFacts[fact]);
    }
  }
  for (const [fact, field] of Object.entries(DATE_FACTS)) {
    const date = DateTime.fromISO(String(caseFacts[fact] ?? ''));
    if (date.isValid) {
      Object.assign(formData, {
        [`${field}-day`]: String(date.day),
        [`${field}-month`]: String(date.month),
        [`${field}-year`]: String(date.year),
      });
    }
  }
  return formData;
}

/** The case facts as the judge left them in the form, as pcs-api records them for the hearing. */
export function caseFactsFromForm(formData: FormData): Record<string, unknown> {
  const text = (field: string): string => String(formData[field] ?? '').trim();
  const facts: Record<string, unknown> = {};
  for (const [fact, field] of Object.entries(FACT_FIELDS)) {
    facts[fact] = MONEY_FACTS.has(fact) ? (parseMoney(text(field)) ?? null) : text(field) || null;
  }
  for (const [fact, field] of Object.entries(DATE_FACTS)) {
    const date = parseDate(text(`${field}-day`), text(`${field}-month`), text(`${field}-year`));
    facts[fact] = date ? date.toISOString().slice(0, 10) : null;
  }
  return facts;
}

/**
 * The hearing as the case facts panel shows it: its date, whose facts the judge starts from, and the case's
 * earlier judicial notes, newest first. An order made without a hearing has none of these.
 */
function hearingModel(hearing: OrderHearing | null | undefined): Record<string, unknown> {
  if (!hearing) {
    return { hearing: null };
  }
  const recorded = hearing.recorded;
  return {
    hearing,
    hearingDateDisplay: displayDate(hearing.date),
    factsRecordedDisplay: recorded
      ? `Last updated by ${recorded.by ?? 'a judge'} on ${displayDate(recorded.on)}`
      : 'From the claim',
    earlierNotes: hearing.earlierNotes.map(note => ({
      by: note.by ?? 'A judge',
      when: displayDate(note.hearingDate ?? note.createdOn),
      note: note.note,
    })),
  };
}

/** A row of the attendance register. */
interface AttendanceRow extends AttendanceParty {
  partyId: string;
  name: string;
}

export function attendanceParties({ caseContext }: OrderStart): AttendanceRow[] {
  const parties = (type: AttendanceParty['type'], list: OrderParty[]): AttendanceRow[] =>
    list.map((party, index) => ({
      id: `${type}-${party.id}`,
      partyId: party.id,
      name: party.name,
      label: `${type[0].toUpperCase()}${type.slice(1)} ${index + 1}: ${party.name}`,
      type,
    }));
  return [...parties('claimant', caseContext.claimants), ...parties('defendant', caseContext.defendants)];
}

/** The make order form as it was last sent, which the page shows in place of the saved order. */
export interface OrderFormSubmission {
  orderType?: MakeOrderType;
  formData?: FormData;
  orderDocumentJson?: string;
}

/**
 * What the make order form shows, for the judge making an order and the caseworker reviewing it: the
 * order's answers and document, or those last sent, over the facts of the case.
 */
export function orderFormModel(start: OrderStart, submission?: OrderFormSubmission): Record<string, unknown> {
  const { caseContext, order, hearing } = start;
  // A hearing's facts and note are pcs-api's record of the hearing, kept apart from the order.
  const recorded: FormData = hearing
    ? { ...caseFactsFormData(hearing.caseFacts), 'hearing-notes': hearing.note ?? '' }
    : {};
  const draft: FormData = { ...recorded, ...(submission?.formData ?? order.formData) };
  const draftOrderType =
    submission?.orderType ??
    order.orderType ??
    (caseContext.application ? APPLICATION_ORDER_TYPE : hearing ? DEFAULT_ORDER_TYPE : ON_PAPER_ORDER_TYPE);
  return {
    draft,
    draftOrderType,
    // An order deciding an application, or made without a hearing, is made on paper: one screen, without the
    // hearing's attendance and possession order types. An earlier draft of a possession order keeps its tabs.
    onPaper: draftOrderType === APPLICATION_ORDER_TYPE || draftOrderType === ON_PAPER_ORDER_TYPE,
    orderDocumentJson:
      submission?.orderDocumentJson ?? (order.docweaveSnapshot ? JSON.stringify(order.docweaveSnapshot) : ''),
    draftValue: (name: string): unknown => draft[name],
    draftChecked: (name: string, value: string): boolean => {
      const saved = draft[name];
      return Array.isArray(saved) ? saved.includes(value) : saved === value;
    },
    draftDate: (prefix: string) => ['day', 'month', 'year'].map(name => ({ name, value: draft[`${prefix}-${name}`] })),
    draftSelect: (items: Record<string, unknown>[], name: string, defaultValue?: string) =>
      items.map(item => ({ ...item, selected: item.value === (draft[name] ?? defaultValue) })),
    attendanceParties: attendanceParties(start),
    openCounterclaim: caseContext.openCounterclaim === true,
    openApplication: caseContext.openApplication === true,
    application: caseContext.application
      ? applicationModel(caseContext.application, caseContext.caseReference)
      : undefined,
    ...hearingModel(hearing),
    caseBundle: caseContext.caseBundle ? caseBundleModel(caseContext.caseBundle, caseContext.caseReference) : undefined,
  };
}
