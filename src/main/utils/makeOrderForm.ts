import { DateTime } from 'luxon';

import { parseDate, parseMoney } from '@utils/makeOrderFormat';
import type { AttendanceParty, MakeOrderType } from '@utils/makeOrderValidation';
import type { FormData, OrderHearing, OrderParty, OrderStart } from '@utils/orderCase';

const DEFAULT_ORDER_TYPE: MakeOrderType = 'OUTRIGHT_POSSESSION';

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

/** Pre-fills the case facts fields, in the form's field names. */
function caseFactsFormData(caseFacts: Record<string, unknown> = {}): FormData {
  const formData: FormData = {};
  for (const [fact, field] of Object.entries(FACT_FIELDS)) {
    if (caseFacts[fact] !== undefined && caseFacts[fact] !== null) {
      formData[field] = String(caseFacts[fact]);
    }
  }
  for (const [fact, field] of Object.entries(DATE_FACTS)) {
    Object.assign(formData, dateFields(field, caseFacts[fact]));
  }
  return formData;
}

function dateFields(field: string, value: unknown): FormData {
  const date = DateTime.fromISO(String(value ?? ''));
  return date.isValid
    ? {
        [`${field}-day`]: String(date.day),
        [`${field}-month`]: String(date.month),
        [`${field}-year`]: String(date.year),
      }
    : {};
}

/** The case facts as the judge left them in the form, as pcs-api records them for the hearing. */
export function caseFactsFromForm(formData: FormData): Record<string, unknown> {
  const text = (field: string): string => String(formData[field] ?? '').trim();
  const facts: Record<string, unknown> = {};
  for (const [fact, field] of Object.entries(FACT_FIELDS)) {
    const value = text(field);
    if (!MONEY_FACTS.has(fact)) {
      facts[fact] = value || null;
      continue;
    }
    facts[fact] = parseMoney(value) ?? null;
  }
  for (const [fact, field] of Object.entries(DATE_FACTS)) {
    const date = parseDate(text(`${field}-day`), text(`${field}-month`), text(`${field}-year`));
    facts[fact] = date ? date.toISOString().slice(0, 10) : null;
  }
  return facts;
}

const displayDate = (iso?: string | null): string =>
  iso ? DateTime.fromISO(iso, { zone: 'Europe/London' }).toFormat('d MMMM yyyy') : '';

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
    hearingJson: JSON.stringify(hearing),
    hearingDateDisplay: displayDate(hearing.date),
    factsRecordedDisplay: recorded
      ? `As at the hearing on ${displayDate(recorded.hearingDate)}, recorded by ${recorded.by ?? 'a judge'}`
      : 'From the claim',
    earlierNotes: hearing.earlierNotes.map(note => ({
      by: note.by ?? 'A judge',
      when: note.hearingDate
        ? `Hearing on ${displayDate(note.hearingDate)}`
        : `Note made on ${displayDate(note.createdOn)}`,
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
  // A hearing's order starts from the facts last recorded for the case, and its own note.
  const draft: FormData = {
    ...caseFactsFormData(hearing?.caseFacts ?? caseContext.caseFacts),
    ...(hearing?.recorded && hearing.recorded.hearingDate !== hearing.date
      ? dateFields('date-last-hearing', hearing.recorded.hearingDate)
      : {}),
    ...(hearing?.note ? { 'hearing-notes': hearing.note } : {}),
    ...(submission?.formData ?? order.formData),
  };
  return {
    draft,
    draftOrderType: submission?.orderType ?? order.orderType ?? DEFAULT_ORDER_TYPE,
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
    ...hearingModel(hearing),
  };
}
