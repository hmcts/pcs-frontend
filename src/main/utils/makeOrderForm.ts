import escapeHtml from 'escape-html';
import { DateTime } from 'luxon';
import { filterXSS } from 'xss';

import {
  NOTICE_DATE_PREFIXES,
  WITHOUT_HEARING,
  formatAddress,
  parseDate,
  parseMoney,
  workingDayOnOrAfter,
} from '@utils/makeOrderFormat';
import {
  type ApplicationToDecide,
  type AttendanceParty,
  type MakeOrderType,
  applicationPrefix,
} from '@utils/makeOrderValidation';
import type {
  FormData,
  OrderApplication,
  OrderCaseBundle,
  OrderHearing,
  OrderParty,
  OrderStart,
} from '@utils/orderCase';

const DEFAULT_ORDER_TYPE: MakeOrderType = 'OUTRIGHT_POSSESSION';
const WITHOUT_HEARING_ORDER_TYPE: MakeOrderType = 'FREE_FORM';
/** An order on the applications alone, which with one open is where the screen starts. */
const NO_CLAIM_ORDER_TYPE: MakeOrderType = 'NO_ORDER_ON_CLAIM';

const YES_NO: Record<string, string> = { YES: 'Yes', NO: 'No' };

/**
 * Whether the applicant asked for the application to be made without notice, as they recorded it when making it. It
 * says nothing of who was in fact told of the application before the order.
 */
export function noticeRequestLabel(withoutNotice?: string | null): string {
  return withoutNotice === 'YES'
    ? 'Without notice requested'
    : withoutNotice === 'NO'
      ? 'Without notice not requested'
      : 'Notice request not recorded';
}

/**
 * Before whom, where and when the order says it was made, as its first sentence gives them: the judge and the court
 * managing the case, as pcs-api names them, on the hearing's date, or today for an order made without one.
 */
export interface OrderBefore {
  judge: string;
  court: string;
  date: string;
}

/** A hearing's date and time as the order pages give it. */
export function hearingTime(iso: string): string {
  return DateTime.fromISO(iso, { zone: 'Europe/London' })
    .setLocale('en-GB')
    .toFormat("d MMMM yyyy 'at' h:mma")
    .replace(/AM|PM/, m => m.toLowerCase());
}

function displayDate(iso: string): string {
  return DateTime.fromISO(iso, { zone: 'Europe/London' }).setLocale('en-GB').toFormat('d MMMM yyyy');
}

/** The case bundle as the order pages link it, with when it was last brought up to date. */
function caseBundleModel(bundle: OrderCaseBundle, caseReference: number) {
  const updated = DateTime.fromISO(String(bundle.updatedAt ?? ''));
  return {
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

/** The rich text an applicant's draft order may hold: its paragraphs, lists and emphasis, nothing that runs. */
const DRAFT_ORDER_TAGS = ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'ul', 'ol', 'li', 'blockquote'];

const draftOrderHtml = (html: string): string =>
  filterXSS(html, {
    whiteList: { ...Object.fromEntries(DRAFT_ORDER_TAGS.map(tag => [tag, []])), ol: ['start'], li: ['value'] },
    stripIgnoreTag: true,
    stripIgnoreTagBody: ['script', 'style'],
  });

/** A paragraph or list item of an applicant's draft order, as plain text, with any list nested in it. */
export interface DraftClause {
  text: string;
  children: DraftClause[];
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

const plain = (text: string): string =>
  text
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, name: string) =>
      name.startsWith('#')
        ? String.fromCodePoint(
            parseInt(name.slice(name[1].toLowerCase() === 'x' ? 2 : 1), name[1].toLowerCase() === 'x' ? 16 : 10)
          )
        : (ENTITIES[name.toLowerCase()] ?? entity)
    )
    .replace(/\s+/g, ' ')
    .trim();

/**
 * An applicant's draft order, as draftOrderHtml cleaned it, as plain clauses: each line of a paragraph one, and each
 * list item one with any list nested in it. Their emphasis is not kept. The cleaned HTML holds only the tags it
 * allows, so its tags and text are read in turn.
 */
export function draftClauses(html: string): DraftClause[] {
  const root: DraftClause[] = [];
  const lists: DraftClause[][] = [root];
  const items: DraftClause[] = [];
  let line = '';
  const endLine = (): void => {
    const text = plain(line);
    line = '';
    if (text) {
      lists[lists.length - 1].push({ text, children: [] });
    }
  };
  for (const [token, closing, tag] of html.matchAll(/<(\/?)([a-z]+)[^>]*>|[^<]+/gi)) {
    const item = items[items.length - 1];
    const name = tag?.toLowerCase();
    if (!name) {
      if (item) {
        item.text += token;
      } else {
        line += token;
      }
    } else if (name === 'ol' || name === 'ul') {
      endLine();
      if (closing) {
        lists.pop();
      } else {
        lists.push(item ? item.children : lists[lists.length - 1]);
      }
    } else if (name === 'li') {
      if (closing) {
        item.text = plain(item.text);
        items.pop();
      } else {
        const opened = { text: '', children: [] };
        lists[lists.length - 1].push(opened);
        items.push(opened);
      }
    } else if (item) {
      item.text += name === 'br' ? ' ' : '';
    } else if (name === 'br' || name === 'p' || name === 'blockquote') {
      endLine();
    }
  }
  endLine();
  return root;
}

const lines = (text: string): string => `<p>${escapeHtml(text).replace(/\r?\n/g, '<br>')}</p>`;

/**
 * The order the applicant asked for: their draft order as the rich text they wrote it in, which the order can take as
 * its wording, and apart from it what they asked the court for and why, as its lines. A paper application has neither.
 */
function requestedWording({ draftOrderWording, whatOrderWanted }: OrderApplication) {
  return {
    requestedWordingHtml: draftOrderWording ? draftOrderHtml(draftOrderWording) : '',
    explanationHtml: whatOrderWanted ? lines(whatOrderWanted) : '',
  };
}

/**
 * The application as its row shows it: its answers in words, and its dates as the court writes them. Its answers on
 * the form start with its prefix, so each application the order can decide keeps its own.
 */
function applicationModel(application: OrderApplication & ApplicationToDecide, caseReference: number) {
  const href = (id: string): string => `/case/${caseReference}/view-documents/${encodeURIComponent(id)}`;
  return {
    ...application,
    prefix: applicationPrefix(application),
    ...requestedWording(application),
    documents: application.documents.map(document => ({ ...document, href: href(document.id) })),
    submittedOnDisplay: displayDate(application.submittedOn),
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

/**
 * What starts the names of a hearing's fields on the form: its facts, note and the version of them the page started
 * from. The page has every hearing the order can be made at, so each field says whose it is.
 */
export function recordPrefix(hearing: Pick<OrderHearing, 'id'>): string {
  return `hearing-${hearing.id}-`;
}

const RECORD_FIELD = /^hearing-\d+-/;

/** The order's answers, without any hearing's facts and note, which are never part of the order. */
export function withoutHearingRecords(formData: FormData): FormData {
  return Object.fromEntries(Object.entries(formData).filter(([field]) => !RECORD_FIELD.test(field)));
}

/** The hearing's facts, note and version as the page posted them, by their own names. */
export function hearingRecord(formData: FormData, hearing: OrderHearing): FormData {
  const prefix = recordPrefix(hearing);
  return Object.fromEntries(
    Object.entries(formData)
      .filter(([field]) => field.startsWith(prefix))
      .map(([field, answer]) => [field.slice(prefix.length), answer])
  );
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

/** The hearing's record as pcs-api sent it, under that hearing's names, as the page starts with it. */
function startedRecord(hearing: OrderHearing): FormData {
  const prefix = recordPrefix(hearing);
  const record = {
    ...caseFactsFormData(hearing.caseFacts),
    notes: hearing.note ?? '',
    version: String(hearing.version ?? ''),
  };
  return Object.fromEntries(Object.entries(record).map(([field, answer]) => [`${prefix}${field}`, answer]));
}

/** The case facts as the judge left them in the hearing's record, as pcs-api records them for the hearing. */
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

/** Whether the judge changed the hearing's facts or note, in its record, from those the page started with. */
export function hearingRecordChanged(started: OrderHearing, record: FormData): boolean {
  const startedFacts = caseFactsFromForm(caseFactsFormData(started.caseFacts));
  return (
    JSON.stringify(caseFactsFromForm(record)) !== JSON.stringify(startedFacts) ||
    noteText(record.notes) !== noteText(started.note)
  );
}

/**
 * A hearing as its case facts panel shows it: its date, whose facts the judge starts from, and the case's
 * earlier judicial notes, newest first. The page has one for each hearing the order can be made at, and shows that of
 * the hearing chosen.
 */
function hearingModel(hearing: OrderHearing, chosen: boolean): Record<string, unknown> {
  const recorded = hearing.recorded;
  return {
    id: hearing.id,
    prefix: recordPrefix(hearing),
    chosen,
    inWales: hearing.inWales,
    hearingDateDisplay: displayDate(hearing.date),
    factsRecordedDisplay: recorded ? `Last updated by ${recorded.by} on ${displayDate(recorded.on)}` : 'From the claim',
    earlierNotes: hearing.earlierNotes.map(note => ({
      by: note.by,
      dateMade: displayDate(note.createdOn),
      note: note.note,
    })),
  };
}

/**
 * The order's answers without the apply-by dates of the choices not made, so neither an order made with notice nor
 * one made on the other basis keeps a date it does not give, to come back as a stale default.
 */
export function withoutUnchosenNoticeDates(formData: FormData): FormData {
  const chosen = NOTICE_DATE_PREFIXES[String(formData['order-notice'] ?? '')];
  const unchosen = Object.values(NOTICE_DATE_PREFIXES).filter(prefix => prefix !== chosen);
  return Object.fromEntries(
    Object.entries(formData).filter(([field]) => !unchosen.some(prefix => field.startsWith(`${prefix}-`)))
  );
}

/** The days an order on the court's own initiative gives to apply to set it aside, vary or stay it, unless changed. */
export const OWN_INITIATIVE_APPLY_BY_DAYS = 7;

/** A date some days from today in London, moved to the next working day, as the parts of a date input. */
export function daysFromToday(
  days: number,
  now: DateTime,
  bankHolidays: readonly string[]
): { day: string; month: string; year: string } {
  const later = now.setZone('Europe/London').plus({ days });
  const date = DateTime.fromJSDate(workingDayOnOrAfter(new Date(later.year, later.month - 1, later.day), bankHolidays));
  // Padded as the page's quick dates fill them.
  return { day: date.toFormat('dd'), month: date.toFormat('MM'), year: date.toFormat('yyyy') };
}

/** The page's choice of when the order is made, for the hearing it is made at, or none. */
function madeAtValue(hearing: OrderHearing | null | undefined): string {
  return hearing ? String(hearing.id) : WITHOUT_HEARING;
}

/**
 * The hearings the order can be made at, earliest first: the one it is made at, even if cancelled since, and the
 * case's others.
 */
function hearingChoices({ hearing, otherHearings }: Pick<OrderStart, 'hearing' | 'otherHearings'>): OrderHearing[] {
  return [...(hearing ? [hearing] : []), ...otherHearings].sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * The hearing the judge's choice on the page names: one the order can be made at, null for none, or undefined for a
 * choice that is not one of them, such as a hearing cancelled since the page opened.
 */
export function chosenHearing(start: OrderStart, posted: unknown): OrderHearing | null | undefined {
  return posted === WITHOUT_HEARING ? null : hearingChoices(start).find(hearing => String(hearing.id) === posted);
}

/** The order's start as the judge has it on the page: made at the hearing they chose, or none, not where it was saved. */
export function madeAt(start: OrderStart, hearing: OrderHearing | null): OrderStart {
  return { ...start, hearing, otherHearings: hearingChoices(start).filter(choice => choice !== hearing) };
}

/**
 * The judge's choice of when the order is made: without a hearing, or at one of the case's hearings, whatever task or
 * link brought them to it, with the one the order is now made at chosen.
 */
export function madeAtModel(start: OrderStart): Record<string, unknown> {
  const current = madeAtValue(start.hearing);
  return {
    madeAtItems: [
      { value: WITHOUT_HEARING, text: 'Without a hearing (box work)' },
      ...hearingChoices(start).map(option => ({
        value: String(option.id),
        text: `At the hearing on ${hearingTime(option.date)}`,
      })),
    ].map(item => ({ ...item, checked: item.value === current })),
  };
}

/** A row of the attendance register. */
interface AttendanceRow extends AttendanceParty {
  partyId: string;
  name: string;
}

/**
 * The case's hearings still to come, at any of which the order can list an application to be heard, by id with when
 * each is. The page leaves out the one the order is made at.
 */
export function upcomingHearings(
  { caseContext }: Pick<OrderStart, 'caseContext'>,
  now: DateTime = DateTime.now()
): { id: string; text: string }[] {
  const today = now.setZone('Europe/London').startOf('day');
  return caseContext.hearings
    .filter(option => DateTime.fromISO(option.date, { zone: 'Europe/London' }) >= today)
    .map(option => ({ id: String(option.id), text: hearingTime(option.date) }));
}

/**
 * The case's open applications the order can decide, the one the judge's task asked them to decide first: that
 * one they must decide, and the others they may leave as they are.
 */
export function applicationsToDecide({
  caseContext,
  taskGenAppId,
}: Pick<OrderStart, 'caseContext' | 'taskGenAppId'>): (OrderApplication & ApplicationToDecide)[] {
  const applications = caseContext.applications.map(application => ({
    ...application,
    required: application.id === taskGenAppId,
    applicantWording: Boolean(application.draftOrderWording),
  }));
  return [...applications.filter(a => a.required), ...applications.filter(a => !a.required)];
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

/**
 * The case's facts the page's script words the order from, sent once in the page as JSON. The judge's answers are the
 * form's own.
 */
export interface OrderContext {
  propertyAddress: string;
  before: Omit<OrderBefore, 'date'>;
  /** Where the order is made as the page opens: a hearing's id, or without one. The judge's choice on the page wins. */
  madeAt: string;
  /** The hearings the order can be made at, each with the date an order made at it names. */
  hearings: { id: string; date: string }[];
  /** The date an order made without a hearing names: the day it was sent for review, or else today. */
  today: string;
  /** Every party, for the wording of an order made without anyone's attendance to name them. */
  parties: { id: string; name: string; kind: AttendanceParty['type'] }[];
  /** The applications the order can decide, in the order the page shows them. */
  applications: {
    prefix: string;
    applicant: string;
    submittedOn: string;
    enforcementSuspension: boolean;
    /** The applicant's draft order as plain clauses, which the order takes as its wording if the judge chooses. */
    draftOrder: DraftClause[];
  }[];
  /** The case's hearings still to come that an application can be listed at, but for the one the order is made at. */
  upcomingHearings: { id: string; text: string }[];
  /** The coming year's bank holidays, as ISO days, which a quick date that must be a working day moves off. */
  bankHolidays: string[];
}

export function orderContext(start: OrderStart, now = DateTime.now()): OrderContext {
  return {
    propertyAddress: formatAddress(start.caseContext.propertyAddress),
    before: { judge: start.judge, court: start.caseContext.court },
    madeAt: madeAtValue(start.hearing),
    hearings: hearingChoices(start).map(hearing => ({ id: String(hearing.id), date: displayDate(hearing.date) })),
    // TODO: what date and court an order made without a hearing names, once the Service team have said.
    today: displayDate(start.order.madeOn ?? now.setZone('Europe/London').toISO()!),
    parties: attendanceParties(start).map(({ partyId, name, type }) => ({ id: partyId, name, kind: type })),
    applications: applicationsToDecide(start).map(application => ({
      prefix: applicationPrefix(application),
      applicant: application.applicant,
      submittedOn: displayDate(application.submittedOn),
      enforcementSuspension: application.enforcementSuspension,
      draftOrder: draftClauses(application.draftOrderWording ? draftOrderHtml(application.draftOrderWording) : ''),
    })),
    upcomingHearings: upcomingHearings(start),
    bankHolidays: start.bankHolidays,
  };
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
  const applications = applicationsToDecide(start);
  // A hearing's facts and note are pcs-api's record of the hearing, kept apart from the order: the page has those of
  // every hearing the judge can choose. The caseworker's review is sent the hearing without them.
  const recording = hearingChoices(start).filter(choice => choice.caseFacts);
  const recorded: FormData = Object.assign({}, ...recording.map(startedRecord));
  // A date the order does not give is left blank, for the page to start afresh if the judge chooses it.
  const draft: FormData = withoutUnchosenNoticeDates({ ...recorded, ...(submission?.formData ?? order.formData) });
  // With an application open the order starts as one on the applications alone, the claim's order types waiting
  // behind a tick box.
  const defaultOrderType = applications.length
    ? NO_CLAIM_ORDER_TYPE
    : hearing
      ? DEFAULT_ORDER_TYPE
      : WITHOUT_HEARING_ORDER_TYPE;
  return {
    draft,
    draftOrderType: submission?.orderType ?? order.orderType ?? defaultOrderType,
    // Made at a hearing, the order records its facts and who attended, and may order possession.
    withoutHearing: !hearing,
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
    openCounterclaim: caseContext.openCounterclaim,
    applications: applications.map(application => applicationModel(application, caseContext.caseReference)),
    upcomingHearings: upcomingHearings(start),
    orderContext: orderContext(start),
    // As the judges agreed: neither at a hearing or on applications to suspend enforcement, which are ordinarily on
    // notice; without notice on other applications; otherwise the court's own initiative.
    orderNoticeDefault: hearing
      ? 'none'
      : !applications.length
        ? 'own-initiative'
        : applications.every(({ enforcementSuspension }) => enforcementSuspension)
          ? 'none'
          : 'without-notice',
    // A date to apply by is a working day, as are the page's quick dates for it.
    ownInitiativeApplyBy: daysFromToday(OWN_INITIATIVE_APPLY_BY_DAYS, DateTime.now(), start.bankHolidays),
    hearingRecords: recording.map(choice => hearingModel(choice, choice === hearing)),
    caseBundle: caseContext.caseBundle ? caseBundleModel(caseContext.caseBundle, caseContext.caseReference) : undefined,
  };
}
