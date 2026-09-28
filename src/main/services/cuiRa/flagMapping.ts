import type { CcdFlags, CuiRaFlags } from './cuiRa.interface';

// Convert cui-ra's flags into the CCD `Flags` shape pcs-api persists.
// Only `path` differs: cui-ra `{ id?, name }` -> CCD ListValue `{ id?, value }`.
export function toCcdFlags(flags: CuiRaFlags): CcdFlags {
  return {
    partyName: flags.partyName,
    roleOnCase: flags.roleOnCase,
    details: (flags.details ?? []).map(detail => ({
      id: detail.id,
      value: {
        ...detail.value,
        path: (detail.value.path ?? []).map(item => ({ id: item.id, value: item.name })),
      },
    })),
  };
}

// Inverse of `toCcdFlags`: convert persisted CCD `Flags` back into the cui-ra shape so we can
// pre-populate the microsite (existingFlags) when a defendant returns to amend their adjustments.
export function toCuiRaFlags(flags: CcdFlags): CuiRaFlags {
  return {
    partyName: flags.partyName,
    roleOnCase: flags.roleOnCase,
    details: (flags.details ?? []).map(detail => ({
      id: detail.id,
      value: {
        ...detail.value,
        path: (detail.value.path ?? []).map(item => ({ id: item.id, name: item.value })),
      },
    })),
  };
}
