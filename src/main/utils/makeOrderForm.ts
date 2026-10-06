import { DateTime } from 'luxon';

import type { AttendanceParty, MakeOrderType } from '@utils/makeOrderValidation';
import type { FormData, OrderApplication, OrderParty, OrderStart } from '@utils/orderCase';

const DEFAULT_ORDER_TYPE: MakeOrderType = 'OUTRIGHT_POSSESSION';
const APPLICATION_ORDER_TYPE: MakeOrderType = 'APPLICATION_DECISION';

const YES_NO: Record<string, string> = { YES: 'Yes', NO: 'No' };

function displayDate(iso?: string | null): string | undefined {
  const date = DateTime.fromISO(String(iso ?? ''));
  return date.isValid ? date.setLocale('en-GB').toFormat('d MMMM yyyy') : undefined;
}

/** The application as its panel shows it: its answers in words, and its dates as the court writes them. */
function applicationModel(application: OrderApplication, caseReference: number) {
  return {
    ...application,
    documents: application.documents.map(document => ({
      ...document,
      href: `/case/${caseReference}/view-documents/${encodeURIComponent(document.id)}`,
    })),
    submittedOnDisplay: displayDate(application.submittedOn),
    referredOnDisplay: displayDate(application.referredOn),
    within14DaysDisplay: YES_NO[application.within14Days ?? ''],
    otherPartiesAgreedDisplay: YES_NO[application.otherPartiesAgreed ?? ''],
    withoutNoticeDisplay: YES_NO[application.withoutNotice ?? ''],
  };
}

/** Pre-fills the case facts fields from the claim, in the form's field names. */
function caseFactsFormData(caseFacts: Record<string, unknown> = {}): FormData {
  const formData: FormData = {};
  const fields: Record<string, string> = {
    tenancyType: 'tenancy-type',
    currentRent: 'current-rent',
    rentFrequency: 'rent-frequency',
    groundsPleaded: 'grounds-pleaded',
  };
  const dates: Record<string, string> = { tenancyStartDate: 'date-tenancy', noticeDate: 'date-notice' };
  for (const [fact, field] of Object.entries(fields)) {
    if (caseFacts[fact] !== undefined && caseFacts[fact] !== null) {
      formData[field] = String(caseFacts[fact]);
    }
  }
  for (const [fact, field] of Object.entries(dates)) {
    const date = DateTime.fromISO(String(caseFacts[fact] ?? ''));
    if (date.isValid) {
      formData[`${field}-day`] = String(date.day);
      formData[`${field}-month`] = String(date.month);
      formData[`${field}-year`] = String(date.year);
    }
  }
  return formData;
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
  const { caseContext, order } = start;
  const draft: FormData = {
    ...caseFactsFormData(caseContext.caseFacts),
    ...(submission?.formData ?? order.formData),
  };
  return {
    draft,
    draftOrderType:
      submission?.orderType ??
      order.orderType ??
      (caseContext.application ? APPLICATION_ORDER_TYPE : DEFAULT_ORDER_TYPE),
    orderDocumentJson: submission?.orderDocumentJson ?? JSON.stringify(order.docweaveSnapshot ?? null),
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
  };
}
