import { type DocBuilder, type InlineBuilder } from '@hmcts-cft/docweave';

import {
  formatDate,
  formatMoney,
  formatTime,
  parseDate,
  parseMoney,
  parseTime,
} from '../../../../utils/makeOrderFormat';
import { type AttendanceEntry, type OrderData } from '../data';

import { describeApplication } from './application';

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

export const AMOUNT_NOT_PROVIDED = '[amount not provided]';

export function money(raw: string): string {
  const amount = parseMoney(raw);
  return amount === undefined ? AMOUNT_NOT_PROVIDED : formatMoney(amount);
}

const PERIODS: Record<string, string> = { weekly: 'week', fortnightly: 'fortnight', monthly: 'month' };

export function frequency(data: OrderData, name: string): string {
  return PERIODS[value(data, name)] ?? '[frequency not provided]';
}

export function sentenceCase(text: string): string {
  return text ? `${text.charAt(0).toUpperCase()}${text.slice(1)}` : text;
}

export function possessive(text: string): string {
  return text.endsWith('s') ? `${text}'` : `${text}'s`;
}

export function joinList(items: readonly string[]): string {
  if (items.length < 2) {
    return items[0] ?? '';
  }
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

export function partyLabels(data: OrderData): {
  claimant: string;
  defendant: string;
  defendantVerb: (singular: string, plural: string) => string;
} {
  const multipleDefendants = data.defendants.length > 1;
  return {
    claimant: data.claimants.length > 1 ? 'the Claimants' : 'the Claimant',
    defendant: multipleDefendants ? 'the Defendants' : 'the Defendant',
    defendantVerb: (singular, plural) => (multipleDefendants ? plural : singular),
  };
}

const ATTENDANCE_ROLES: Record<string, (party: string) => string> = {
  counsel: party => `counsel for ${party}`,
  solicitor: party => `solicitor for ${party}`,
  'solicitor-agent': party => `solicitor's agent for ${party}`,
  'housing-officer': party => `the housing officer on behalf of ${party}`,
  'duty-adviser': party => `the duty adviser on behalf of ${party}`,
  'litigant-in-person': party => `${party} in person`,
};

/**
 * A recital for each application the order decides:
 * "AND UPON considering the first claimant's application dated ...", the first "UPON" unless a recital came before it.
 */
function addApplicationRecitals(order: DocBuilder, data: OrderData, after: boolean): void {
  let upon = after;
  for (const application of data.applications) {
    if (application.decision === 'none') {
      continue;
    }
    order.paragraph(
      `${application.prefix}-upon`,
      `${upon ? 'AND UPON' : 'UPON'} considering ${describeApplication(data, application)}`
    );
    upon = true;
  }
}

const PARTY_ORDINALS = ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth', 'Tenth'];

export function partyReference(data: OrderData, kind: 'claimant' | 'defendant', position: number): string {
  const parties = kind === 'claimant' ? data.claimants : data.defendants;
  const role = sentenceCase(kind);
  if (parties.length < 2 || position < 0) {
    return `the ${role}`;
  }
  const ordinal = PARTY_ORDINALS[position];
  return ordinal ? `the ${ordinal} ${role}` : `${role} ${position + 1}`;
}

function attendanceParty(entry: AttendanceEntry, data: OrderData): string {
  const parties = entry.partyKind === 'claimant' ? data.claimants : data.defendants;
  return partyReference(
    data,
    entry.partyKind,
    parties.findIndex(party => party.id === entry.partyId)
  );
}

function addAttendance(order: DocBuilder, data: OrderData): void {
  const heard: { choice: string; name: string; parties: string[] }[] = [];
  const letters: AttendanceEntry[] = [];
  const absent: AttendanceEntry[] = [];
  for (const entry of data.attendance) {
    const party = attendanceParty(entry, data);
    if (entry.choice === 'letter-only') {
      letters.push(entry);
    } else if (entry.choice === 'not-present') {
      absent.push(entry);
    } else if (ATTENDANCE_ROLES[entry.choice]) {
      const name = entry.choice === 'litigant-in-person' ? '' : entry.representativeName;
      const representative = name && heard.find(item => item.name === name && item.choice === entry.choice);
      if (representative) {
        representative.parties.push(party);
      } else {
        heard.push({ choice: entry.choice, name, parties: [party] });
      }
    }
  }
  const spoken = heard.map(({ choice, name, parties }) => {
    const description = ATTENDANCE_ROLES[choice](joinList(parties));
    return name ? `${name}, ${description}` : description;
  });
  if (spoken.length || letters.length) {
    const speakers =
      spoken.length > 1 && spoken.some(speaker => speaker.includes(','))
        ? `${spoken.slice(0, -1).join(', ')}, and ${spoken[spoken.length - 1]}`
        : joinList(spoken);
    const heardFrom = spoken.length ? `heard from ${speakers}` : '';
    const readFrom = letters.length
      ? `read ${letters.length === 1 ? 'a letter' : 'letters'} from ${joinList(
          letters.map(entry => entry.representativeName || entry.partyName)
        )}`
      : '';
    const wording = `The Court ${joinList([heardFrom, readFrom].filter(Boolean))}.`;
    if (spoken.length) {
      order.paragraph('attendance-heard', wording);
    } else {
      const first = letters[0];
      order.paragraph(`attendance-letter-${first.rowIndex}`, content => {
        content.fact('attendance', wording, { sourceId: first.sourceId });
      });
    }
  }
  if (absent.length) {
    const first = absent[0];
    const parties = joinList(absent.map(entry => attendanceParty(entry, data)));
    order.paragraph(`attendance-absent-${first.rowIndex}`, content => {
      content.fact('attendance', `${sentenceCase(parties)} did not attend.`, { sourceId: first.sourceId });
    });
  }
}

export function addPreamble(order: DocBuilder, data: OrderData): void {
  const { judge, court, date: madeOn } = data.before;
  order.paragraph('before', content =>
    content
      .text('This order is made by ')
      .fact('before-judge', judge)
      .text(' at the ')
      .fact('before-court', court)
      .text(' on ')
      .fact('before-date', madeOn)
      .text('.')
  );
  if (data.withoutHearing) {
    order.paragraph('papers-considered', 'UPON the Court considering the papers without a hearing');
  }
  addAttendance(order, data);
  if (selected(data, 'recitals', 'yes')) {
    order.paragraph('recital-introduction', 'The Court records that:');
    order.text('recital', value(data, 'recitals-text'), { sourceId: 'recitals-text' });
  }
  addApplicationRecitals(order, data, data.withoutHearing);
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

/**
 * The CaseMan-style costs wording used by suspended possession and adjournment orders. Fixed costs are of the claim,
 * or of the application an order decides.
 */
export function caseManCosts(claimant: string, defendant: string, of: 'claim' | 'application' = 'claim'): CostsWording {
  const defendantPays = `${sentenceCase(defendant)} shall pay ${possessive(claimant)} costs`;
  return {
    amounts: {
      'def-pay-cl-fixed':
        of === 'claim'
          ? `${sentenceCase(defendant)} shall pay ${possessive(claimant)} fixed costs of £`
          : `${defendantPays} of the application in the fixed sum of £`,
      'def-pay-cl-summary': `${defendantPays} summarily assessed in the sum of £`,
      'cl-pay-def-summary': `${sentenceCase(claimant)} shall pay ${possessive(defendant)} costs summarily assessed in the sum of £`,
      'fixed-same-terms': `${defendantPays} of the ${of} in the fixed sum of £`,
      'summary-same-terms': `${defendantPays} summarily assessed in the sum of £`,
    },
    fixed: {
      'in-case': 'Costs in the case.',
      reserved: 'Costs reserved.',
      'no-order': 'No order for costs.',
      'public-funding': `There shall be a detailed assessment of ${possessive(defendant)} publicly funded costs.`,
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

/**
 * When possession is ordered by: the time the judge gave, if any, then the day, as in "4pm on 4 December 2026". The
 * time is a fact of its own, so it can be shown as the time field's.
 */
export function addPossessionDeadline(
  content: InlineBuilder,
  data: OrderData,
  factId: string,
  dateField: string,
  timeField: string
): void {
  const time = parseTime(value(data, timeField));
  if (time) {
    content.fact(`${factId}-time`, formatTime(time), { sourceId: timeField }).text(' on ');
  }
  content.fact(factId, date(data, dateField), { sourceId: dateField });
}
