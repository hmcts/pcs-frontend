import type { OrderBefore, OrderContext } from '../../../utils/makeOrderForm';

export interface OrderParty {
  id: string;
  name: string;
}

export interface AttendanceEntry {
  sourceId: string;
  rowIndex: number;
  partyKind: 'claimant' | 'defendant';
  partyId: string;
  partyName: string;
  choice: string;
  representativeName: string;
}

/** An open application the order can decide, with what the judge decides about it. */
export interface OrderApplication {
  /** What its answers on the form start with: `app-<id>`. */
  prefix: string;
  applicant: string;
  submittedOn: string;
  /** An application to suspend enforcement, which an order can suspend on conditions. */
  enforcementSuspension: boolean;
  /** An application to adjourn a hearing, which an order can adjourn. */
  adjournment: boolean;
  /** What the judge decides about it: "none" while they leave it as it is. */
  decision: string;
  /** When the case's hearing the judge lists it to be heard at is, if they list it at one rather than a new one. */
  listedAt?: string;
  /** Whether a new hearing it is listed for is without notice to the other parties. */
  listWithoutNotice: boolean;
}

export interface OrderData {
  /** The applications the order can decide, in the order they were made. */
  applications: readonly OrderApplication[];
  answers: Readonly<Record<string, readonly string[]>>;
  selectedControlIds: Readonly<Record<string, string>>;
  propertyAddress: string;
  /** Before whom, where and when the order says it was made. */
  before: OrderBefore;
  /** An order made without a hearing, which says so instead of who attended. */
  withoutHearing: boolean;
  claimants: readonly OrderParty[];
  defendants: readonly OrderParty[];
  attendance: readonly AttendanceEntry[];
}

/** The case's facts the server sent with the page. */
export function readOrderContext(form: HTMLFormElement): OrderContext {
  return JSON.parse(form.querySelector('#order-context')!.textContent!);
}

/**
 * Where the order is made: the judge's choice on the page, a hearing's id or without one, or where the page opened
 * it for court staff reviewing it, who choose none.
 */
export function chosenMadeAt(form: HTMLFormElement, context: OrderContext = readOrderContext(form)): string {
  const choice = form.querySelector<HTMLInputElement>(
    'input[name="made-at"]:checked, input[name="made-at"][type="hidden"]'
  );
  return choice?.value ?? context.madeAt;
}

export function readOrderData(form: HTMLFormElement): OrderData {
  const context = readOrderContext(form);
  const hearing = context.hearings.find(({ id }) => id === chosenMadeAt(form, context));

  const answers: Record<string, string[]> = {};
  new FormData(form).forEach((entry, name) => {
    if (typeof entry === 'string') {
      (answers[name] ??= []).push(entry);
    }
  });

  const selectedControlIds: Record<string, string> = {};
  form.querySelectorAll<HTMLInputElement>('input:checked').forEach(control => {
    if (control.name) {
      selectedControlIds[control.name] = control.id || control.name;
    }
  });

  // No one attends an order made without a hearing.
  const attendance: AttendanceEntry[] = [];
  form.querySelectorAll<HTMLElement>(hearing ? '[data-attendance-row]' : ':not(*)').forEach((row, rowIndex) => {
    const partyKind = row.dataset.partyKind === 'claimant' ? 'claimant' : 'defendant';
    const partyName = row.dataset.partyName;

    const choice = row.querySelector<HTMLInputElement>('input[type="radio"]:checked')?.value;
    if (!choice) {
      return;
    }
    attendance.push({
      sourceId: row.id,
      rowIndex,
      partyKind,
      partyId: row.dataset.partyId ?? '',
      partyName: partyName || `the ${partyKind}`,
      choice,
      representativeName: row.querySelector<HTMLInputElement>('input[type="text"]')?.value.trim() ?? '',
    });
  });

  const hearings = new Map(context.upcomingHearings.map(({ id, text }) => [id, text]));
  const party = ({ id, name }: OrderParty): OrderParty => ({ id, name });

  return {
    applications: context.applications.map(application => ({
      ...application,
      decision: answers[`${application.prefix}-decision`]?.[0] ?? 'none',
      listedAt: hearings.get(answers[`${application.prefix}-list-at`]?.[0] ?? ''),
      listWithoutNotice: answers[`${application.prefix}-list-without-notice`]?.includes('yes') ?? false,
    })),
    answers,
    selectedControlIds,
    propertyAddress: context.propertyAddress,
    before: { ...context.before, date: hearing?.date ?? context.today },
    withoutHearing: !hearing,
    claimants: context.parties.filter(({ kind }) => kind === 'claimant').map(party),
    defendants: context.parties.filter(({ kind }) => kind === 'defendant').map(party),
    attendance,
  };
}
