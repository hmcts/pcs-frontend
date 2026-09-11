import { buildOrder } from '@hmcts-cft/docweave';

import { type OrderData } from '../data';

import {
  type CostsWording,
  addCosts,
  addPaymentTerm,
  addPreamble,
  date,
  money,
  partyNames,
  selected,
  value,
  values,
} from './common';

const OUTRIGHT_COSTS: CostsWording = {
  amounts: {
    'def-pay-cl-fixed': "The defendant(s) must pay the claimant(s)' fixed costs of £",
    'def-pay-cl-summary': "The defendant(s) must pay the claimant(s)' costs, summarily assessed at £",
    'cl-pay-def-summary': "The claimant(s) must pay the defendant(s)' costs, summarily assessed at £",
  },
  fixed: {
    'in-case': 'Costs in the case.',
    reserved: 'Costs reserved.',
    'no-order': 'There is no order as to costs.',
    'public-funding':
      "The defendant(s)' costs are to be subject to detailed assessment under the public funding regulations.",
    'same-terms': 'Costs are payable on the same terms as the suspension.',
    'fixed-same-terms':
      "The defendant(s) must pay the claimant(s)' fixed costs, payable on the same terms as the suspension.",
    'summary-same-terms':
      "The defendant(s) must pay the claimant(s)' summary assessed costs, payable on the same terms as the suspension.",
  },
  missing: '[costs order not provided]',
};

export function buildOutrightOrder(data: OrderData): ReturnType<typeof buildOrder> {
  const address = data.propertyAddress || '[property address not provided]';
  const claimants = partyNames(data.claimants, 'the claimant(s)');
  const defendants = partyNames(data.defendants, 'the defendant(s)');
  const options = values(data, 'outright-options');
  const sections = options.includes('money-judgment') ? values(data, 'outright-mj-sections') : [];
  const plans = sections.includes('payment-plan') ? values(data, 'outright-mj-plan') : [];

  return buildOrder(order => {
    addPreamble(order, data);
    order.orderedList('outright-clauses', list => {
      list.item('possession', content => {
        content
          .text('The defendant(s) must give up possession of ')
          .fact('address', address)
          .text(' to the claimant(s) ');
        if (value(data, 'outright-possession') === 'forthwith') {
          content.fact('deadline', 'forthwith', { sourceId: 'outright-possession' });
        } else {
          content
            .text('on or before ')
            .fact('deadline', date(data, 'outright-by-date'), { sourceId: 'outright-by-date' });
        }
        content.text('.');
      });
      list.item('grounds', content => {
        const details = value(data, 'outright-grounds-details');
        content
          .text('This order for possession was made on ')
          .fact('type', value(data, 'outright-grounds-type') || '[grounds type not provided]', {
            sourceId: 'outright-grounds-type',
          })
          .text(' grounds');
        if (details) {
          content.text(', namely ').fact('details', details, { sourceId: 'outright-grounds-details' });
        }
        content.text('.');
      });
      if (sections.includes('arrears')) {
        list.item('money-judgment', content => {
          const arrears = Number(value(data, 'outright-mj-arrears').split(',').join(''));
          const interestText = value(data, 'outright-mj-interest');
          const interest = Number(interestText.split(',').join(''));
          const total =
            Number.isFinite(arrears) && interestText && Number.isFinite(interest)
              ? String(arrears + interest)
              : value(data, 'outright-mj-arrears');
          content
            .text(`Judgment for the claimant(s) in the ${interestText ? 'total ' : ''}sum of £`)
            .fact('amount', money(total), { sourceId: 'outright-mj-amounts' })
            .text('.');
        });
      }
      if (options.includes('use-occupation')) {
        list.item('use-occupation', content => {
          content
            .fact('defendants', defendants)
            .text(' must pay to ')
            .fact('claimants', claimants)
            .text(' £')
            .fact('rate', money(value(data, 'outright-use-occupation-rate')), {
              sourceId: 'outright-use-occupation-rate',
            })
            .text(' per day for damages for unlawful occupation from ')
            .fact('date', date(data, 'outright-use-occupation-from-date'), {
              sourceId: 'outright-use-occupation-from-date',
            })
            .text(` until possession of the property is given to ${claimants}.`);
        });
      }
      if (selected(data, 'costs', 'yes')) {
        list.item('costs', content => addCosts(content, data, OUTRIGHT_COSTS));
      }
      if (plans.includes('lump') || plans.includes('instalments')) {
        list.item('payment-terms', content => {
          content.text('The above sums must be paid by the defendant(s) to the claimant(s) ');
          if (plans.includes('lump')) {
            addPaymentTerm(content, data, {
              kind: 'one-off',
              lead: 'by a payment of £',
              fields: { amount: 'outright-mj-lump-amount', date: 'outright-mj-lump-date' },
              facts: 'lump',
            });
            if (selected(data, 'outright-mj-balance', 'yes')) {
              content.text(' and the balance by ').fact('balance-date', date(data, 'outright-mj-balance-date'), {
                sourceId: 'outright-mj-balance-date',
              });
            }
          }
          if (plans.includes('lump') && plans.includes('instalments')) {
            content.text(', and ');
          }
          if (plans.includes('instalments')) {
            addPaymentTerm(content, data, {
              kind: 'instalments',
              lead: 'by instalment payments of £',
              fields: {
                amount: 'outright-mj-inst-amount',
                frequency: 'outright-mj-inst-freq',
                date: 'outright-mj-inst-date',
              },
              facts: 'instalment',
            });
          }
          content.text('.');
        });
      }
      if (options.includes('transfer-high-court')) {
        list.item(
          'high-court-transfer',
          'The order for possession is transferred to the High Court solely for the purpose of enforcement.'
        );
      }
    });
  });
}
