import type { Request } from 'express';

import type { SummaryCard } from './summary';

/**
 * The summary pages a Change link can return to. `?returnTo=` names one of these steps, never a URL, so it cannot
 * send the claimant anywhere outside the journey.
 */
export const RETURN_TO_STEPS = [
  'claimant-cya',
  'defendant-cya',
  'tenancy-cya',
  'notice-cya',
  'arrears-cya',
  'situation-cya',
  'check-your-answers',
] as const;

export type ReturnToStep = (typeof RETURN_TO_STEPS)[number];

export function isReturnToStep(stepName: string | undefined): stepName is ReturnToStep {
  return (RETURN_TO_STEPS as readonly string[]).includes(stepName ?? '');
}

/** The summary page the request came from a Change link on, if it names one. */
export function returnToOf(req: Request): ReturnToStep | undefined {
  const value = Array.isArray(req.query?.returnTo) ? req.query.returnTo[0] : req.query?.returnTo;
  return typeof value === 'string' && isReturnToStep(value) ? value : undefined;
}

/** `href` with `?returnTo=` set to the summary page, keeping its other query parameters and fragment. */
export function withReturnTo(href: string, summaryStep: ReturnToStep): string {
  const [beforeHash, hash] = href.split('#', 2);
  const [path, query = ''] = beforeHash.split('?', 2);
  const params = new URLSearchParams(query);
  params.set('returnTo', summaryStep);
  return `${path}?${params.toString()}${hash !== undefined ? `#${hash}` : ''}`;
}

/** The step a journey URL is for: its last path segment. */
export function stepNameOfUrl(url: string): string {
  return url.split(/[?#]/, 1)[0].split('/').pop() ?? '';
}

/** The summary cards with every row action and table link sending the claimant back to `summaryStep`. */
export function cardsReturningTo(cards: SummaryCard[], summaryStep: ReturnToStep): SummaryCard[] {
  return cards.map(card => ({
    ...card,
    rows: card.rows.map(row =>
      row.actions
        ? {
            ...row,
            actions: {
              items: row.actions.items.map(item => ({ ...item, href: withReturnTo(item.href, summaryStep) })),
            },
          }
        : row
    ),
    ...(card.tableChange
      ? { tableChange: { ...card.tableChange, href: withReturnTo(card.tableChange.href, summaryStep) } }
      : {}),
  }));
}
