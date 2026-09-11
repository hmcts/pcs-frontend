import { type InlineBuilder, type OrderBuilder } from '@hmcts-cft/docweave';

import { formatDate, formatMoney, parseDate } from '../../../../utils/makeOrderFormat';
import { type AttendanceEntry, type OrderData, type OrderParty } from '../data';

export function value(data: OrderData, name: string): string {
  return data.answers[name]?.[0]?.trim() ?? '';
}

export function values(data: OrderData, name: string): readonly string[] {
  return data.answers[name] ?? [];
}

export function selected(data: OrderData, name: string, option: string): boolean {
  return values(data, name).includes(option);
}

export function selectedControlId(data: OrderData, name: string): string {
  return data.selectedControlIds[name] ?? name;
}

export function date(data: OrderData, prefix: string): string {
  const parsed = parseDate(value(data, `${prefix}-day`), value(data, `${prefix}-month`), value(data, `${prefix}-year`));
  return parsed ? formatDate(parsed) : '[date not provided]';
}

export function money(raw: string): string {
  const amount = Number(raw.split(',').join(''));
  return raw && Number.isFinite(amount) ? formatMoney(amount) : '[amount not provided]';
}

export function frequency(data: OrderData, name: string): string {
  return value(data, name) === 'weekly' ? 'week' : 'month';
}

export function sentenceCase(text: string): string {
  return text ? `${text.charAt(0).toUpperCase()}${text.slice(1)}` : text;
}

function possessive(text: string): string {
  return text.endsWith('s') ? `${text}'` : `${text}'s`;
}

export function joinList(items: readonly string[]): string {
  if (items.length < 2) {
    return items[0] ?? '';
  }
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

export function partyNames(parties: readonly OrderParty[], fallback: string): string {
  const names = parties.map(party => party.name).filter(Boolean);
  return names.length ? names.join(', ') : fallback;
}

export function partyLabels(data: OrderData): {
  claimant: string;
  defendant: string;
  defendantVerb: (singular: string, plural: string) => string;
} {
  const multipleDefendants = data.defendants.length > 1;
  return {
    claimant: data.claimants.length > 1 ? 'the claimants' : 'the claimant',
    defendant: multipleDefendants ? 'the defendants' : 'the defendant',
    defendantVerb: (singular, plural) => (multipleDefendants ? plural : singular),
  };
}

const ATTENDANCE_ROLES: Record<string, (party: string) => string> = {
  counsel: party => `counsel for ${party}`,
  solicitor: party => `solicitor for ${party}`,
  'solicitor-agent': party => `solicitor's agent for ${party}`,
  'housing-officer': party => `the housing officer on behalf of ${party}`,
  'duty-adviser': party => `the duty adviser on behalf of ${party}`,
  'litigant-in-person': party => `${party} acting in person`,
};

export function addPreamble(order: OrderBuilder, data: OrderData): void {
  const heard: string[] = [];
  const paragraphs: { id: string; entry: AttendanceEntry; text: string }[] = [];
  for (const entry of data.attendance) {
    const party = `the ${entry.partyKind}`;
    const role = ATTENDANCE_ROLES[entry.choice];
    if (entry.choice === 'letter-only') {
      paragraphs.push({
        id: `attendance-letter-${entry.rowIndex}`,
        entry,
        text: `The Court read a letter from ${entry.representativeName || entry.partyLabel}.`,
      });
    } else if (entry.choice === 'not-present') {
      paragraphs.push({
        id: `attendance-absent-${entry.rowIndex}`,
        entry,
        text: `The ${entry.partyLabel} did not attend the hearing, but the Court was satisfied they had received notice of the hearing, and it was reasonable to proceed in their absence.`,
      });
    } else if (role) {
      heard.push(entry.representativeName ? `${entry.representativeName}, ${role(party)}` : role(party));
    }
  }
  if (heard.length) {
    order.paragraph('attendance-heard', `The Court heard from ${joinList(heard)}.`);
  }
  for (const paragraph of paragraphs) {
    order.paragraph(paragraph.id, content => {
      content.fact('attendance', paragraph.text, { sourceId: paragraph.entry.sourceId });
    });
  }
  if (selected(data, 'recitals', 'yes')) {
    value(data, 'recital')
      .split(/\n\s*\n/)
      .filter(Boolean)
      .forEach((text, index) =>
        order.paragraph(`recital-${index}`, content => {
          content.fact('text', text, { sourceId: 'recitals-text' });
        })
      );
  }
  order.paragraph('ordered-that', 'IT IS ORDERED THAT:');
}

export interface PaymentTerm {
  kind: 'one-off' | 'instalments';
  /** Text before the amount, for example "payment of £". */
  lead: string;
  /** Text between the amount and the date or frequency, for example " to the claimant". */
  afterAmount?: string;
  /** Form field id prefix: `${prefix}-amount`, `${prefix}-date` and `${prefix}-frequency`. */
  fields: { amount: string; date: string; frequency?: string };
  /** Fact id prefix within the clause. */
  facts: string;
}

/** "payment of £X [to the claimant] by DATE" or "payments of £X every week, the first instalment to be paid on or before DATE". */
export function addPaymentTerm(content: InlineBuilder, data: OrderData, term: PaymentTerm): void {
  content
    .text(term.lead)
    .fact(`${term.facts}-amount`, money(value(data, term.fields.amount)), { sourceId: term.fields.amount })
    .text(term.afterAmount ?? '');
  if (term.kind === 'one-off') {
    content.text(' by ');
  } else {
    content
      .text(' every ')
      .fact(`${term.facts}-frequency`, frequency(data, term.fields.frequency ?? ''), {
        sourceId: term.fields.frequency,
      })
      .text(', the first instalment to be paid on or before ');
  }
  content.fact(`${term.facts}-date`, date(data, term.fields.date), { sourceId: term.fields.date });
}

export const SAME_TERMS_COSTS = new Set(['same-terms', 'fixed-same-terms', 'summary-same-terms']);

export interface CostsWording {
  /** Choices followed by an amount: the text before "£". */
  amounts: Record<string, string>;
  /** Choices that are a complete sentence. */
  fixed: Record<string, string>;
  /** Shown when nothing usable was chosen; omit to add nothing. */
  missing?: string;
}

/** The CaseMan-style costs wording used by suspended possession and adjournment orders. */
export function caseManCosts(claimant: string, defendant: string): CostsWording {
  const defendantPays = `${sentenceCase(defendant)} shall pay ${possessive(claimant)} costs`;
  return {
    amounts: {
      'def-pay-cl-fixed': `${defendantPays} of the claim in the fixed sum of £`,
      'def-pay-cl-summary': `${defendantPays} in the summarily assessed sum of £`,
      'cl-pay-def-summary': `${sentenceCase(claimant)} shall pay ${possessive(defendant)} costs in the summarily assessed sum of £`,
      'fixed-same-terms': `${defendantPays} of the claim in the fixed sum of £`,
      'summary-same-terms': `${defendantPays} in the summarily assessed sum of £`,
    },
    fixed: {
      'in-case': 'Costs in the case.',
      reserved: 'Costs reserved.',
      'no-order': 'No order as to costs.',
      'public-funding': `There be a detailed assessment of ${possessive(defendant)} publicly funded costs.`,
      'same-terms': `${defendantPays}.`,
    },
  };
}

/** Whether the costs answers produce a clause under the given wording. */
export function hasCosts(data: OrderData, wording: CostsWording): boolean {
  if (!selected(data, 'costs', 'yes')) {
    return false;
  }
  const choice = value(data, 'costs-choice');
  return (
    wording.missing !== undefined ||
    choice in wording.amounts ||
    choice in wording.fixed ||
    (choice === 'other' && Boolean(value(data, 'costs-other-text')))
  );
}

export function addCosts(content: InlineBuilder, data: OrderData, wording: CostsWording): void {
  const choice = value(data, 'costs-choice');
  const sourceId = selectedControlId(data, 'costs-choice');
  const amountId = `costs-${choice}-amount`;
  if (choice in wording.amounts) {
    content
      .fact('choice', wording.amounts[choice], { sourceId })
      .fact('amount', money(value(data, amountId)), { sourceId: amountId })
      .text('.');
  } else if (choice === 'other') {
    content.fact('other', value(data, 'costs-other-text') || wording.missing || '', { sourceId: 'costs-other-text' });
  } else {
    content.fact('choice', wording.fixed[choice] || wording.missing || '', { sourceId });
  }
}
