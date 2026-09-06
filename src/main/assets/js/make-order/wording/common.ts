import { type InlineBuilder, type OrderBuilder } from '@hmcts-cft/docweave';

import { type AttendanceEntry, type OrderData, type OrderParty } from '../data';

interface AttendanceFact {
  id: string;
  sourceId: string;
  text: string;
}

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
  const day = Number(value(data, `${prefix}-day`));
  const month = Number(value(data, `${prefix}-month`));
  const year = Number(value(data, `${prefix}-year`));
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    !day ||
    !month ||
    !year ||
    parsed.getUTCDate() !== day ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCFullYear() !== year
  ) {
    return '[date not provided]';
  }
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(parsed);
}

export function money(raw: string): string {
  const amount = Number(raw.split(',').join(''));
  return raw && Number.isFinite(amount)
    ? amount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '[amount not provided]';
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

function attendanceFacts(entries: readonly AttendanceEntry[]): {
  heard: AttendanceFact[];
  paragraphs: AttendanceFact[];
} {
  const heard: AttendanceFact[] = [];
  const paragraphs: AttendanceFact[] = [];
  entries.forEach(entry => {
    const party = entry.partyKind === 'claimant' ? 'the claimant' : 'the defendant';
    if (entry.choice === 'letter-only') {
      paragraphs.push({
        id: `attendance-letter-${entry.rowIndex}`,
        sourceId: entry.sourceId,
        text: `The Court read a letter from ${entry.representativeName || entry.partyLabel}.`,
      });
      return;
    }
    if (entry.choice === 'not-present') {
      paragraphs.push({
        id: `attendance-absent-${entry.rowIndex}`,
        sourceId: entry.sourceId,
        text: `The ${entry.partyLabel} did not attend the hearing, but the Court was satisfied they had received notice of the hearing, and it was reasonable to proceed in their absence.`,
      });
      return;
    }
    const roles: Record<string, string> = {
      counsel: `counsel for ${party}`,
      solicitor: `solicitor for ${party}`,
      'solicitor-agent': `solicitor's agent for ${party}`,
      'housing-officer': `the housing officer on behalf of ${party}`,
      'duty-adviser': `the duty adviser on behalf of ${party}`,
      'litigant-in-person': `${party} acting in person`,
    };
    const role = roles[entry.choice];
    if (role) {
      heard.push({
        id: `attendance-heard-${entry.rowIndex}`,
        sourceId: entry.sourceId,
        text: entry.representativeName ? `${entry.representativeName}, ${role}` : role,
      });
    }
  });
  return { heard, paragraphs };
}

export function addPreamble(order: OrderBuilder, data: OrderData): void {
  const attendance = attendanceFacts(data.attendance);
  if (attendance.heard.length) {
    order.paragraph('attendance-heard', `The Court heard from ${joinList(attendance.heard.map(entry => entry.text))}.`);
  }
  attendance.paragraphs.forEach(paragraph =>
    order.paragraph(paragraph.id, content => {
      content.fact('attendance', paragraph.text, { sourceId: paragraph.sourceId });
    })
  );
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

export const SAME_TERMS_COSTS = new Set(['same-terms', 'fixed-same-terms', 'summary-same-terms']);

const CASE_MAN_COST_CHOICES = new Set([
  'def-pay-cl-fixed',
  'def-pay-cl-summary',
  'cl-pay-def-summary',
  'in-case',
  'reserved',
  'no-order',
  'public-funding',
  'same-terms',
  'fixed-same-terms',
  'summary-same-terms',
]);

export function hasCaseManCosts(data: OrderData): boolean {
  if (!selected(data, 'costs', 'yes')) {
    return false;
  }
  const choice = value(data, 'costs-choice');
  return choice === 'other' ? Boolean(value(data, 'costs-other-text')) : CASE_MAN_COST_CHOICES.has(choice);
}

export function addCaseManCosts(content: InlineBuilder, data: OrderData, claimant: string, defendant: string): void {
  const choice = value(data, 'costs-choice');
  const sourceId = selectedControlId(data, 'costs-choice');
  const amountCosts: Record<string, { amountId: string; prefix: string }> = {
    'def-pay-cl-fixed': {
      amountId: 'costs-def-pay-cl-fixed-amount',
      prefix: `${sentenceCase(defendant)} shall pay ${possessive(claimant)} costs of the claim in the fixed sum of £`,
    },
    'def-pay-cl-summary': {
      amountId: 'costs-def-pay-cl-summary-amount',
      prefix: `${sentenceCase(defendant)} shall pay ${possessive(claimant)} costs in the summarily assessed sum of £`,
    },
    'cl-pay-def-summary': {
      amountId: 'costs-cl-pay-def-summary-amount',
      prefix: `${sentenceCase(claimant)} shall pay ${possessive(defendant)} costs in the summarily assessed sum of £`,
    },
    'fixed-same-terms': {
      amountId: 'costs-fixed-same-terms-amount',
      prefix: `${sentenceCase(defendant)} shall pay ${possessive(claimant)} costs of the claim in the fixed sum of £`,
    },
    'summary-same-terms': {
      amountId: 'costs-summary-same-terms-amount',
      prefix: `${sentenceCase(defendant)} shall pay ${possessive(claimant)} costs in the summarily assessed sum of £`,
    },
  };
  const fixedCosts: Record<string, string> = {
    'in-case': 'Costs in the case.',
    reserved: 'Costs reserved.',
    'no-order': 'No order as to costs.',
    'public-funding': `There be a detailed assessment of ${possessive(defendant)} publicly funded costs.`,
    'same-terms': `${sentenceCase(defendant)} shall pay ${possessive(claimant)} costs.`,
  };
  const amountCost = amountCosts[choice];
  if (amountCost) {
    content
      .fact('choice', amountCost.prefix, { sourceId })
      .fact('amount', money(value(data, amountCost.amountId)), { sourceId: amountCost.amountId })
      .text('.');
  } else if (choice === 'other') {
    content.fact('other', value(data, 'costs-other-text'), { sourceId: 'costs-other-text' });
  } else {
    content.fact('choice', fixedCosts[choice] ?? '', { sourceId });
  }
}
