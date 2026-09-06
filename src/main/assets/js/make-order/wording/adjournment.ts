import { type InlineBuilder, buildOrder } from '@hmcts-cft/docweave';

import { type OrderData } from '../data';

import {
  addCaseManCosts,
  addPreamble,
  date,
  hasCaseManCosts,
  money,
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
  if (amount === '1') {
    return unit === 'hours' ? '1 hour' : '1 minute';
  }
  return `${amount} ${unit}`;
}

function addOneOffTerm(content: InlineBuilder, data: OrderData, claimant: string): void {
  content
    .text(`a payment to ${claimant} of £`)
    .fact('adjournment-one-off-amount', money(value(data, 'adj-gen-oneoff-amount')), {
      sourceId: 'adj-gen-oneoff-amount',
    })
    .text(' by ')
    .fact('adjournment-one-off-date', date(data, 'adj-gen-oneoff-date'), {
      sourceId: 'adj-gen-oneoff-date',
    });
}

function addInstalmentTerm(
  content: InlineBuilder,
  data: OrderData,
  claimant: string,
  option: 'current-rent-plus' | 'payments'
): void {
  const prefix = option === 'current-rent-plus' ? 'adj-gen-current-rent-plus' : 'adj-gen-payments';
  const frequency = value(data, `${prefix}-frequency`) === 'weekly' ? 'week' : 'month';
  content
    .text(`instalment payments to ${claimant} of £`)
    .fact(`adjournment-${option}-amount`, money(value(data, `${prefix}-amount`)), {
      sourceId: `${prefix}-amount`,
    })
    .text(' every ')
    .fact(`adjournment-${option}-frequency`, frequency, { sourceId: `${prefix}-frequency` })
    .text(', the first instalment to be paid on or before ')
    .fact(`adjournment-${option}-date`, date(data, `${prefix}-date`), { sourceId: `${prefix}-date` });
}

export function buildAdjournmentOrder(data: OrderData): ReturnType<typeof buildOrder> {
  const type = value(data, 'adj-type');
  const { claimant, defendant, defendantVerb } = partyLabels(data);
  const directions = values(data, 'adj-directions');
  const conditions = values(data, 'adj-gen');

  return buildOrder(order => {
    addPreamble(order, data);
    if (!type) {
      return;
    }
    order.orderedList('adjournment-clauses', list => {
      if (type === 'further-hearing') {
        const when = value(data, 'adj-when') || 'next-list';
        list.item('adjournment-listing', content => {
          if (when === 'next-list') {
            content.text('The claim shall be adjourned to be heard on the next available possession list after ');
          } else if (when === 'next-date') {
            content.text(
              'The claim shall be adjourned to be heard on the next available date (non-possession list) after '
            );
          } else {
            content.text('The claim shall be adjourned to be heard on ');
          }
          content.fact('adjournment-hearing-date', date(data, `adj-hearing-date-${when}`), {
            sourceId: `adj-hearing-date-${when}`,
          });
          if (when === 'specific') {
            content
              .text(' at ')
              .fact('adjournment-hearing-time', value(data, 'adj-specific-time') || '[hearing time not provided]', {
                sourceId: 'adj-specific-time',
              });
          }
          content.text(' with a time estimate of ').fact('adjournment-time-estimate', timeEstimate(data), {
            sourceId: 'adj-time-estimate-group',
          });
          if (when !== 'specific') {
            content.text('. Further details of the hearing will be provided by the court.');
          } else {
            content.text('.');
          }
        });
        if (directions.includes('defence')) {
          list.item('adjournment-defence', content => {
            content
              .text(`${sentenceCase(defendant)} must by 4pm on `)
              .fact('adjournment-defence-date', date(data, 'adj-defence-date'), {
                sourceId: 'adj-defence-date',
              })
              .text(' send to the court and all other parties a defence.');
          });
        }
        if (directions.includes('counterclaim')) {
          list.item('adjournment-counterclaim', content => {
            content
              .text(`${sentenceCase(defendant)} must by 4pm on `)
              .fact('adjournment-counterclaim-date', date(data, 'adj-counterclaim-date'), {
                sourceId: 'adj-counterclaim-date',
              })
              .text(
                ' send to the court and all other parties a defence and any counterclaim, having paid any court fees which are due.'
              );
          });
        }
        if (directions.includes('claimant-reply')) {
          list.item('adjournment-claimant-reply', content => {
            content
              .text(`${sentenceCase(claimant)} must by 4pm on `)
              .fact('adjournment-claimant-reply-date', date(data, 'adj-claimant-reply-date'), {
                sourceId: 'adj-claimant-reply-date',
              })
              .text(' send to the court and all other parties a defence to the counterclaim and any reply.');
          });
        }
      } else {
        const paymentOption = conditions.includes('current-rent-plus')
          ? 'current-rent-plus'
          : conditions.includes('payments')
            ? 'payments'
            : undefined;
        const hasPaymentTerms = Boolean(paymentOption || conditions.includes('oneoff'));
        const hasRestore = conditions.includes('restore');
        if (hasPaymentTerms) {
          list.item(
            'adjournment-condition',
            `The claim is adjourned generally on condition that ${defendant} ${defendantVerb('makes', 'make')} payment of current rent as it falls due together with the following payments towards any arrears:`,
            item => {
              item.orderedList('adjournment-payment-terms', terms => {
                if (conditions.includes('oneoff')) {
                  terms.item('adjournment-one-off', content => {
                    addOneOffTerm(content, data, claimant);
                    content.text(';');
                  });
                }
                if (paymentOption) {
                  terms.item('adjournment-instalments', content => {
                    addInstalmentTerm(content, data, claimant, paymentOption);
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
          if (hasRestore) {
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
            if (hasRestore) {
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
      if (hasCaseManCosts(data)) {
        list.item('adjournment-costs', content => addCaseManCosts(content, data, claimant, defendant));
      }
    });
  });
}
