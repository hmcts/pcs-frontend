import { parseDate } from '@utils/makeOrderFormat';
import type { FormData } from '@utils/orderCase';

/*
 * What an order decides, as pcs-api records it: the same for an order its form generated and one the judge wrote.
 * This is the only place that reads the make order form's field names to say so; pcs-api never reads them.
 */

export type GenAppDecision = 'GRANT' | 'DISMISS' | 'STRIKE_OUT' | 'LIST' | 'OTHER';

export interface ApplicationDecision {
  genAppId: string;
  decision: GenAppDecision;
}

export type ClaimOutcomeKind =
  'OUTRIGHT_POSSESSION' | 'SUSPENDED_POSSESSION' | 'STRUCK_OUT' | 'DISMISSED' | 'NO_ORDER' | 'OTHER';

export interface ClaimOutcome {
  kind: ClaimOutcomeKind;
  possessionForthwith?: boolean;
  possessionDate?: string;
  grounds?: 'MANDATORY' | 'DISCRETIONARY';
  groundsDetails?: string;
  warrantOnNotice?: boolean;
}

const DECISIONS: Record<string, GenAppDecision> = {
  grant: 'GRANT',
  dismiss: 'DISMISS',
  'strike-out': 'STRIKE_OUT',
  list: 'LIST',
  other: 'OTHER',
};

const DECISION_FIELD = /^app-(.+)-decision$/;

function first(value: unknown): string {
  return String((Array.isArray(value) ? value[0] : value) ?? '').trim();
}

function all(value: unknown): string[] {
  return (Array.isArray(value) ? value : [value]).filter(v => v !== undefined && v !== '').map(String);
}

function isoDate(formData: FormData, prefix: string): string | undefined {
  const parts = ['day', 'month', 'year'].map(part => first(formData[`${prefix}-${part}`]));
  return /^\d{4}$/.test(parts[2]) ? parseDate(parts[0], parts[1], parts[2])?.toISOString().slice(0, 10) : undefined;
}

/** What the order decides about each application it covers; "Not dealt with" decides nothing. */
export function applicationDecisions(formData: FormData = {}): ApplicationDecision[] {
  return Object.entries(formData).flatMap(([field, value]) => {
    const genAppId = DECISION_FIELD.exec(field)?.[1];
    const decision = DECISIONS[first(value)];
    return genAppId && decision ? [{ genAppId, decision }] : [];
  });
}

/** What an order its form generated decides about the claim, from the judge's answers for its type. */
export function claimOutcome(orderType: string, formData: FormData = {}): ClaimOutcome {
  switch (orderType) {
    case 'OUTRIGHT_POSSESSION': {
      const grounds = first(formData['outright-grounds-type']);
      return {
        kind: 'OUTRIGHT_POSSESSION',
        possessionForthwith: first(formData['outright-possession']) === 'forthwith',
        possessionDate:
          first(formData['outright-possession']) === 'by' ? isoDate(formData, 'outright-by-date') : undefined,
        grounds: grounds === 'mandatory' ? 'MANDATORY' : grounds === 'discretionary' ? 'DISCRETIONARY' : undefined,
        groundsDetails: first(formData['outright-grounds-details']) || undefined,
      };
    }
    case 'SUSPENDED_POSSESSION': {
      const options = all(formData['suspended-options']);
      return {
        kind: 'SUSPENDED_POSSESSION',
        possessionDate: isoDate(formData, 'suspended-by-date'),
        warrantOnNotice: options.includes('warrant-on-notice'),
      };
    }
    case 'STRIKE_OUT_DISMISSAL': {
      const outcome = all(formData['strike-subjects']).includes('claim') ? first(formData['strike-claim-outcome']) : '';
      return { kind: outcome === 'struck-out' ? 'STRUCK_OUT' : outcome === 'dismissed' ? 'DISMISSED' : 'NO_ORDER' };
    }
    // An adjournment manages the case without deciding the claim.
    case 'ADJOURNMENT':
    case 'NO_ORDER_ON_CLAIM':
      return { kind: 'NO_ORDER' };
    default:
      return { kind: 'OTHER' };
  }
}
