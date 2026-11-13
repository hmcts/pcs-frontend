import { type OrderedListBuilder } from '@hmcts-cft/docweave';

import { formatTime, parseTime } from '../../../../utils/makeOrderFormat';
import { type OrderData } from '../data';

import { date, partyLabels, sentenceCase, value, values } from './common';

/** When the hearing is, after what the order says happens to its subject. */
const WHEN: Record<string, string> = {
  'next-list': ' on the next available possession list after ',
  'next-date': ' on the next available date (non-possession list) after ',
  specific: ' on ',
};

const DIRECTIONS: Record<string, { party: 'claimant' | 'defendant'; text: string }> = {
  defence: { party: 'defendant', text: ' submit to the court and all other parties a defence.' },
  counterclaim: {
    party: 'defendant',
    text: ' submit to the court and all other parties a defence and any counterclaim, having paid any court fees which are due.',
  },
  'claimant-reply': {
    party: 'claimant',
    text: ' submit to the court and all other parties a defence to the counterclaim and any reply.',
  },
};

function timeEstimate(data: OrderData, prefix: string): string {
  const amount = value(data, `${prefix}-time-estimate`);
  const unit = value(data, `${prefix}-time-estimate-unit`);
  if (!amount || (unit !== 'minutes' && unit !== 'hours')) {
    return '[time not provided]';
  }
  return amount === '1' ? `1 ${unit.slice(0, -1)}` : `${amount} ${unit}`;
}

/**
 * The clauses listing a hearing, from the listing questions the form asks with the prefix: when it is and for
 * how long, then any directions before it. The order says what happens to the subject, as in "The claim shall be
 * adjourned to be heard"; ids names the clauses and facts, as the adjournment order always has.
 */
export function addListing(
  list: OrderedListBuilder,
  data: OrderData,
  prefix: string,
  ids: string,
  happens: string
): void {
  const labels = partyLabels(data);
  const when = value(data, `${prefix}-when`) || 'next-list';
  list.item(`${ids}-listing`, content => {
    content.text(`${happens}${WHEN[when]}`).fact(`${ids}-hearing-date`, date(data, `${prefix}-hearing-date-${when}`), {
      sourceId: `${prefix}-hearing-date-${when}`,
    });
    if (when === 'specific') {
      const time = parseTime(value(data, `${prefix}-specific-time`));
      content.text(' at ').fact(`${ids}-hearing-time`, time ? formatTime(time) : '[hearing time not provided]', {
        sourceId: `${prefix}-specific-time`,
      });
    }
    content
      .text(' with a time estimate of ')
      .fact(`${ids}-time-estimate`, timeEstimate(data, prefix), { sourceId: `${prefix}-time-estimate-group` })
      .text(when === 'specific' ? '.' : '. Further details of the hearing will be provided by the court.');
  });
  const directions = values(data, `${prefix}-directions`);
  for (const [direction, { party, text }] of Object.entries(DIRECTIONS)) {
    if (directions.includes(direction)) {
      list.item(`${ids}-${direction}`, content => {
        content
          .text(`${sentenceCase(labels[party])} must by 4pm on `)
          .fact(`${ids}-${direction}-date`, date(data, `${prefix}-${direction}-date`), {
            sourceId: `${prefix}-${direction}-date`,
          })
          .text(text);
      });
    }
  }
}
