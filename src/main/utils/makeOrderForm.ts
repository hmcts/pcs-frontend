import { DateTime } from 'luxon';

import { parseDate, parseMoney } from '@utils/makeOrderFormat';
import {
  AT_HEARING_ORDER_TYPES,
  type AttendanceParty,
  type MakeOrderType,
  applicationPrefix,
} from '@utils/makeOrderValidation';
import type { FormData, OrderApplication, OrderHearing, OrderParty, OrderStart } from '@utils/orderCase';
import { richTextHtml } from '@utils/richText';

const DEFAULT_ORDER_TYPE: MakeOrderType = 'OUTRIGHT_POSSESSION';
const APPLICATION_ORDER_TYPE: MakeOrderType = 'APPLICATION_DECISION';
const WITHOUT_HEARING_ORDER_TYPE: MakeOrderType = 'FREE_FORM';
/** An order on the applications alone, which with one open is where the screen starts. */
const NO_CLAIM_ORDER_TYPE: MakeOrderType = 'NO_ORDER_ON_CLAIM';

const YES_NO: Record<string, string> = { YES: 'Yes', NO: 'No' };

function displayDate(iso?: string | null): string | undefined {
  const date = DateTime.fromISO(String(iso ?? ''), { zone: 'Europe/London' });
  return date.isValid ? date.setLocale('en-GB').toFormat('d MMMM yyyy') : undefined;
}

/**
 * The application as its row shows it: its answers in words, and its dates as the court writes them. The order
 * it asks for is shown as the applicant formatted it, and is HTML to use only when they wrote rich text. Its
 * answers on the form start with its prefix, so each application the order can decide keeps its own.
 */
function applicationModel(application: OrderApplication, caseReference: number) {
  const href = (id: string): string => `/case/${caseReference}/view-documents/${encodeURIComponent(id)}`;
  return {
    ...application,
    prefix: applicationPrefix(application),
    // What a "something else" application is for, in the applicant's words, which its order recites.
    purpose: application.somethingElseDetails || application.type,
    whatOrderWantedHtml: richTextHtml(application.whatOrderWanted),
    documents: application.documents.map(document => ({ ...document, href: href(document.id) })),
    submittedOnDisplay: displayDate(application.submittedOn),
    referredOnDisplay: displayDate(application.referredOn),
    within14DaysDisplay: YES_NO[application.within14Days ?? ''],
    otherPartiesAgreedDisplay: YES_NO[application.otherPartiesAgreed ?? ''],
    withoutNoticeDisplay: YES_NO[application.withoutNotice ?? ''],
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

const noteText = (note: unknown): string =>
  String(note ?? '')
    .replace(/\r\n/g, '\n')
    .trim();

/** Whether the judge changed the hearing's facts or note from those the page started with. */
export function hearingRecordChanged(started: OrderHearing, formData: FormData): boolean {
  const startedFacts = caseFactsFromForm(caseFactsFormData(started.caseFacts));
  return (
    JSON.stringify(caseFactsFromForm(formData)) !== JSON.stringify(startedFacts) ||
    noteText(formData['hearing-notes']) !== noteText(started.note)
  );
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

/**
 * Whether the order records who attended a hearing: one made for a hearing, or one that already says who attended,
 * as an order a caseworker reviews does. Any other order is made without a hearing, so asks no one's attendance.
 */
export function recordsAttendance(hearing: OrderHearing | null | undefined, formData: FormData = {}): boolean {
  return Boolean(hearing) || Object.keys(formData).some(field => field.endsWith('-attendance'));
}

/**
 * The applications the order can decide: the one it is made on as box work, or every open application for an
 * order made at a hearing, or without one on the case.
 */
export function applicationsToDecide({ caseContext }: Pick<OrderStart, 'caseContext'>): OrderApplication[] {
  return caseContext.application ? [caseContext.application] : (caseContext.applications ?? []);
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
  const atHearing = recordsAttendance(hearing, draft);
  // With an application open the order starts as one on the applications alone, the claim's order types waiting
  // behind a tick box (judicial feedback, 22 October 2026).
  const orderType =
    submission?.orderType ??
    order.orderType ??
    (caseContext.application
      ? APPLICATION_ORDER_TYPE
      : applicationsToDecide(start).length
        ? NO_CLAIM_ORDER_TYPE
        : atHearing
          ? DEFAULT_ORDER_TYPE
          : WITHOUT_HEARING_ORDER_TYPE);
  return {
    draft,
    // A possession order saved without a hearing, from before the screen stopped offering one, opens on free form.
    draftOrderType: !atHearing && AT_HEARING_ORDER_TYPES.includes(orderType) ? WITHOUT_HEARING_ORDER_TYPE : orderType,
    // The screen follows what the order is for: an application's decision, a hearing's record and every order type,
    // or every order type made without a hearing, with no one's attendance.
    withoutHearing: !atHearing,
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
    // Every party, for the wording of an order made without anyone's attendance to name them.
    orderParties: attendanceParties(start).map(({ partyId, name, type }) => ({ id: partyId, name, type })),
    openCounterclaim: caseContext.openCounterclaim === true,
    // Made on one application, the order decides that one; otherwise it may decide any that are open.
    application: caseContext.application
      ? applicationModel(caseContext.application, caseContext.caseReference)
      : undefined,
    applications: applicationsToDecide(start).map(application =>
      applicationModel(application, caseContext.caseReference)
    ),
    ...hearingModel(hearing),
  };
}
