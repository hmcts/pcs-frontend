import { type InlineBuilder, buildOrder } from '@hmcts-cft/docweave';

import { type OrderData } from '../data';

import { addPreamble, date, money, partyNames, selected, selectedControlId, value, values } from './common';

function addOutrightCosts(content: InlineBuilder, data: OrderData): void {
  const choice = value(data, 'costs-choice');
  const sourceId = selectedControlId(data, 'costs-choice');
  const amountCosts: Record<string, { amountId: string; prefix: string }> = {
    'def-pay-cl-fixed': {
      amountId: 'costs-def-pay-cl-fixed-amount',
      prefix: "The defendant(s) must pay the claimant(s)' fixed costs of £",
    },
    'def-pay-cl-summary': {
      amountId: 'costs-def-pay-cl-summary-amount',
      prefix: "The defendant(s) must pay the claimant(s)' costs, summarily assessed at £",
    },
    'cl-pay-def-summary': {
      amountId: 'costs-cl-pay-def-summary-amount',
      prefix: "The claimant(s) must pay the defendant(s)' costs, summarily assessed at £",
    },
  };
  const fixedCosts: Record<string, string> = {
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
  };
  const amountCost = amountCosts[choice];
  if (amountCost) {
    content
      .fact('choice', amountCost.prefix, { sourceId })
      .fact('amount', money(value(data, amountCost.amountId)), { sourceId: amountCost.amountId })
      .text('.');
  } else if (choice === 'other') {
    content.fact('other', value(data, 'costs-other-text') || '[costs order not provided]', {
      sourceId: 'costs-other-text',
    });
  } else {
    content.fact('choice', fixedCosts[choice] || '[costs order not provided]', { sourceId });
  }
}

export function buildOutrightOrder(data: OrderData): ReturnType<typeof buildOrder> {
  const address = data.propertyAddress || '[property address not provided]';
  const claimants = partyNames(data.claimants, 'the claimant(s)');
  const defendants = partyNames(data.defendants, 'the defendant(s)');
  const options = new Set(values(data, 'outright-options'));
  const hasMoneyJudgment = options.has('money-judgment');
  const hasMoneyJudgmentArrears = hasMoneyJudgment && selected(data, 'outright-mj-sections', 'arrears');
  const hasMoneyJudgmentPaymentPlan = hasMoneyJudgment && selected(data, 'outright-mj-sections', 'payment-plan');

  return buildOrder(order => {
    addPreamble(order, data);
    order.orderedList('outright-clauses', list => {
      list.item('possession', content => {
        content
          .text('The defendant(s) must give up possession of ')
          .fact('address', address)
          .text(' to the claimant(s) ');
        if (value(data, 'outright-possession') === 'forthwith') {
          content.fact('deadline', 'forthwith', { sourceId: 'outright-possession' }).text('.');
        } else {
          content
            .text('on or before ')
            .fact('deadline', date(data, 'outright-by-date'), { sourceId: 'outright-by-date' })
            .text('.');
        }
      });
      list.item('grounds', content => {
        const groundsDetails = value(data, 'outright-grounds-details');
        content
          .text('This order for possession was made on ')
          .fact('type', value(data, 'outright-grounds-type') || '[grounds type not provided]', {
            sourceId: 'outright-grounds-type',
          })
          .text(' grounds');
        if (groundsDetails) {
          content.text(', namely ').fact('details', groundsDetails, {
            sourceId: 'outright-grounds-details',
          });
        }
        content.text('.');
      });
      if (hasMoneyJudgmentArrears) {
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
      if (options.has('use-occupation')) {
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
        list.item('costs', content => addOutrightCosts(content, data));
      }
      if (
        hasMoneyJudgmentPaymentPlan &&
        (selected(data, 'outright-mj-plan', 'lump') || selected(data, 'outright-mj-plan', 'instalments'))
      ) {
        list.item('payment-terms', content => {
          content.text('The above sums must be paid by the defendant(s) to the claimant(s) ');
          if (selected(data, 'outright-mj-plan', 'lump')) {
            content
              .text('by a payment of £')
              .fact('lump-amount', money(value(data, 'outright-mj-lump-amount')), {
                sourceId: 'outright-mj-lump-amount',
              })
              .text(' by ')
              .fact('lump-date', date(data, 'outright-mj-lump-date'), {
                sourceId: 'outright-mj-lump-date',
              });
            if (selected(data, 'outright-mj-balance', 'yes')) {
              content.text(' and the balance by ').fact('balance-date', date(data, 'outright-mj-balance-date'), {
                sourceId: 'outright-mj-balance-date',
              });
            }
          }
          if (selected(data, 'outright-mj-plan', 'lump') && selected(data, 'outright-mj-plan', 'instalments')) {
            content.text(', and ');
          }
          if (selected(data, 'outright-mj-plan', 'instalments')) {
            const frequency = value(data, 'outright-mj-inst-freq') === 'weekly' ? 'week' : 'month';
            content
              .text('by instalment payments of £')
              .fact('instalment-amount', money(value(data, 'outright-mj-inst-amount')), {
                sourceId: 'outright-mj-inst-amount',
              })
              .text(' every ')
              .fact('instalment-frequency', frequency, {
                sourceId: 'outright-mj-inst-freq',
              })
              .text(', the first instalment to be paid on or before ')
              .fact('instalment-date', date(data, 'outright-mj-inst-date'), {
                sourceId: 'outright-mj-inst-date',
              });
          }
          content.text('.');
        });
      }
      if (options.has('transfer-high-court')) {
        list.item(
          'high-court-transfer',
          'The order for possession is transferred to the High Court solely for the purpose of enforcement.'
        );
      }
    });
  });
}
