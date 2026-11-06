export interface OrderParty {
  id: string;
  name: string;
}

export interface AttendanceEntry {
  sourceId: string;
  rowIndex: number;
  partyKind: 'claimant' | 'defendant';
  /** The party's name as the order gives it, not the "Defendant 1: …" label the screen shows. */
  partyName: string;
  choice: string;
  representativeName: string;
}

/** An open application the order can decide, as its row on the page gives it. */
export interface OrderApplication {
  id: string;
  /** What its answers on the form start with: `app-<id>`. */
  prefix: string;
  applicant: string;
  submittedOn: string;
  /** Whether the applicant asked for an order, which granting the application puts in the order as HTML. */
  wordingHtml: string;
  /** An application to suspend the warrant of possession, granted on conditions or dismissed with an eviction date. */
  warrantSuspension: boolean;
  /** What the judge decides about it: "none" while they leave it as it is. */
  decision: string;
}

export interface OrderData {
  /** The applications the order can decide, in the order they were made. */
  applications: readonly OrderApplication[];
  answers: Readonly<Record<string, readonly string[]>>;
  selectedControlIds: Readonly<Record<string, string>>;
  propertyAddress: string;
  /** An order made without a hearing, which says so instead of who attended. */
  withoutHearing: boolean;
  claimants: readonly OrderParty[];
  defendants: readonly OrderParty[];
  attendance: readonly AttendanceEntry[];
}

export function readOrderData(form: HTMLFormElement): OrderData {
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

  const parties: { id: string; name: string; type: string }[] = JSON.parse(form.dataset.parties || '[]');
  const party = ({ id, name }: OrderParty): OrderParty => ({ id, name });
  const attendance: AttendanceEntry[] = [];
  form.querySelectorAll<HTMLElement>('[data-attendance-row]').forEach((row, rowIndex) => {
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
      partyName: partyName || `the ${partyKind}`,
      choice,
      representativeName: row.querySelector<HTMLInputElement>('input[type="text"]')?.value.trim() ?? '',
    });
  });

  const applications: OrderApplication[] = [];
  form.querySelectorAll<HTMLElement>('[data-application]').forEach(row => {
    const prefix = row.dataset.applicationPrefix ?? '';
    applications.push({
      id: row.dataset.applicationId ?? '',
      prefix,
      applicant: row.dataset.applicationApplicant ?? 'the applicant',
      submittedOn: row.dataset.applicationSubmitted ?? '',
      wordingHtml: row.dataset.applicationWordingHtml ?? '',
      warrantSuspension: row.dataset.applicationWarrant !== undefined,
      decision: answers[`${prefix}-decision`]?.[0] ?? 'none',
    });
  });

  return {
    applications,
    answers,
    selectedControlIds,
    propertyAddress: form.dataset.propertyAddress ?? '',
    withoutHearing: form.dataset.withoutHearing !== undefined,
    claimants: parties.filter(({ type }) => type === 'claimant').map(party),
    defendants: parties.filter(({ type }) => type !== 'claimant').map(party),
    attendance,
  };
}
