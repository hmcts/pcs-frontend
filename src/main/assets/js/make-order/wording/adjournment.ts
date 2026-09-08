import { buildOrder } from '@hmcts-cft/docweave';

import { type OrderData } from '../data';

import {
  addCosts,
  addPaymentTerm,
  addPreamble,
  caseManCosts,
  date,
  hasCosts,
  partyLabels,
  sentenceCase,
  value,
  values,
} from './common';

function timeEstimate(data: OrderData): string {
  const amount = value(data, 'adj-time-estimate');
  const unit = value(data, 'adj-time-estimate-unit');
  if (!amount || (unit !== 'minutes' && unit !== 'hours')) {
    return '[time not provided]';
  }
  return amount === '1' ? `1 ${unit.slice(0, -1)}` : `${amount} ${unit}`;
}

const LISTINGS: Record<string, string> = {
  'next-list': 'The claim shall be adjourned to be heard on the next available possession list after ',
  'next-date': 'The claim shall be adjourned to be heard on the next available date (non-possession list) after ',
  specific: 'The claim shall be adjourned to be heard on ',
};

const DIRECTIONS: Record<string, { party: 'claimant' | 'defendant'; text: string }> = {
  defence: { party: 'defendant', text: ' send to the court and all other parties a defence.' },
  counterclaim: {
    party: 'defendant',
    text: ' send to the court and all other parties a defence and any counterclaim, having paid any court fees which are due.',
  },
  'claimant-reply': {
    party: 'claimant',
    text: ' send to the court and all other parties a defence to the counterclaim and any reply.',
  },
};

export function buildAdjournmentOrder(data: OrderData): ReturnType<typeof buildOrder> {
  const type = value(data, 'adj-type');
  const labels = partyLabels(data);
  const { claimant, defendant, defendantVerb } = labels;
  const directions = values(data, 'adj-directions');
  const conditions = values(data, 'adj-gen');
  const costs = caseManCosts(claimant, defendant);

  return buildOrder(order => {
    addPreamble(order, data);
    if (!type) {
      return;
    }
    order.orderedList('adjournment-clauses', list => {
      if (type === 'further-hearing') {
        const when = value(data, 'adj-when') || 'next-list';
        list.item('adjournment-listing', content => {
          content.text(LISTINGS[when]).fact('adjournment-hearing-date', date(data, `adj-hearing-date-${when}`), {
            sourceId: `adj-hearing-date-${when}`,
          });
          if (when === 'specific') {
            content
              .text(' at ')
              .fact('adjournment-hearing-time', value(data, 'adj-specific-time') || '[hearing time not provided]', {
                sourceId: 'adj-specific-time',
              });
          }
          content
            .text(' with a time estimate of ')
            .fact('adjournment-time-estimate', timeEstimate(data), { sourceId: 'adj-time-estimate-group' })
            .text(when === 'specific' ? '.' : '. Further details of the hearing will be provided by the court.');
        });
        for (const [direction, { party, text }] of Object.entries(DIRECTIONS)) {
          if (directions.includes(direction)) {
            list.item(`adjournment-${direction}`, content => {
              content
                .text(`${sentenceCase(labels[party])} must by 4pm on `)
                .fact(`adjournment-${direction}-date`, date(data, `adj-${direction}-date`), {
                  sourceId: `adj-${direction}-date`,
                })
                .text(text);
            });
          }
        }
      } else {
        const instalments = ['current-rent-plus', 'payments'].find(option => conditions.includes(option));
        const restore = conditions.includes('restore');
        if (instalments || conditions.includes('oneoff')) {
          list.item(
            'adjournment-condition',
            `The claim is adjourned generally on condition that ${defendant} ${defendantVerb('makes', 'make')} payment of current rent as it falls due together with the following payments towards any arrears:`,
            item => {
              item.orderedList('adjournment-payment-terms', terms => {
                if (conditions.includes('oneoff')) {
                  terms.item('adjournment-one-off', content => {
                    addPaymentTerm(content, data, {
                      kind: 'one-off',
                      lead: `a payment to ${claimant} of £`,
                      fields: { amount: 'adj-gen-oneoff-amount', date: 'adj-gen-oneoff-date' },
                      facts: 'adjournment-one-off',
                    });
                    content.text(';');
                  });
                }
                if (instalments) {
                  const prefix = `adj-gen-${instalments}`;
                  terms.item('adjournment-instalments', content => {
                    addPaymentTerm(content, data, {
                      kind: 'instalments',
                      lead: `instalment payments to ${claimant} of £`,
                      fields: { amount: `${prefix}-amount`, frequency: `${prefix}-frequency`, date: `${prefix}-date` },
                      facts: `adjournment-${instalments}`,
                    });
                    content.text(';');
                  });
                }
              });
            }
          );
          list.item(
            'adjournment-restore-right',
            `${sentenceCase(claimant)} may apply to restore the claim if there is a breach of such condition or conditions. This application shall be made on notice to all parties. ${sentenceCase(claimant)} shall set out in such application details of the alleged breach or breaches and attach any evidence relied upon in support.`
          );
          if (restore) {
            list.item('adjournment-strike-out', content => {
              content
                .text('If no application to restore the claim is made by ')
                .fact('adjournment-restore-date', date(data, 'adj-gen-restore-date'), {
                  sourceId: 'adj-gen-restore-date',
                })
                .text(' the claim shall stand as struck out without further application or order of the court.');
            });
          }
        } else {
          list.item('adjournment-generally', content => {
            content.text(
              'This claim is adjourned generally with liberty to restore by application by any party on notice to all other parties.'
            );
            if (restore) {
              content
                .text(' If no application is made by 4pm on ')
                .fact('adjournment-restore-date', date(data, 'adj-gen-restore-date'), {
                  sourceId: 'adj-gen-restore-date',
                })
                .text(
                  ' the claim shall automatically be struck out without the need for any further application or order.'
                );
            }
          });
        }
      }
      if (hasCosts(data, costs)) {
        list.item('adjournment-costs', content => addCosts(content, data, costs));
      }
    });
  });
}
