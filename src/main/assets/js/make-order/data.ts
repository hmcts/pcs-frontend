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

/** The general application an order decides, as its panel on the page gives it. */
export interface OrderApplication {
  reference: string;
  type: string;
  applicant: string;
  submittedOn: string;
}

export interface OrderData {
  application?: OrderApplication;
  answers: Readonly<Record<string, readonly string[]>>;
  selectedControlIds: Readonly<Record<string, string>>;
  propertyAddress: string;
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

  const claimants = new Map<string, OrderParty>();
  const defendants = new Map<string, OrderParty>();
  const attendance: AttendanceEntry[] = [];
  form.querySelectorAll<HTMLElement>('[data-attendance-row]').forEach((row, rowIndex) => {
    const partyKind = row.dataset.partyKind === 'claimant' ? 'claimant' : 'defendant';
    const partyId = row.dataset.partyId;
    const partyName = row.dataset.partyName;
    if (partyId && partyName !== undefined) {
      (partyKind === 'claimant' ? claimants : defendants).set(partyId, { id: partyId, name: partyName });
    }

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

  const panel = form.querySelector<HTMLElement>('[data-application]');
  const application = panel
    ? {
        reference: panel.dataset.applicationReference ?? '',
        type: panel.dataset.applicationType ?? '',
        applicant: panel.dataset.applicationApplicant ?? 'the applicant',
        submittedOn: panel.dataset.applicationSubmitted ?? '',
      }
    : undefined;

  return {
    application,
    answers,
    selectedControlIds,
    propertyAddress: form.dataset.propertyAddress ?? '',
    claimants: [...claimants.values()],
    defendants: [...defendants.values()],
    attendance,
  };
}
