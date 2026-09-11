export interface OrderParty {
  id: string;
  name: string;
}

export interface AttendanceEntry {
  id: string;
  sourceId: string;
  rowIndex: number;
  partyKind: 'claimant' | 'defendant';
  partyLabel: string;
  choice: string;
  representativeName: string;
}

export interface OrderData {
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
      id: row.id,
      sourceId: row.id,
      rowIndex,
      partyKind,
      partyLabel: row.dataset.partyLabel ?? `the ${partyKind}`,
      choice,
      representativeName: row.querySelector<HTMLInputElement>('input[type="text"]')?.value.trim() ?? '',
    });
  });

  return {
    answers,
    selectedControlIds,
    propertyAddress: form.dataset.propertyAddress ?? '',
    claimants: [...claimants.values()],
    defendants: [...defendants.values()],
    attendance,
  };
}
