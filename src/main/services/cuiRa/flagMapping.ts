import type { CcdFlags, CuiRaFlags } from './cuiRa.interface';

// Convert cui-ra's flags into the CCD `Flags` shape pcs-api persists.
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
