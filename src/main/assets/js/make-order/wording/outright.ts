import { type OrderedListBuilder } from '@hmcts-cft/docweave';

import { formatMoney, parseMoney } from '../../../../utils/makeOrderFormat';
import { type OrderData } from '../data';

import {
  AMOUNT_NOT_PROVIDED,
  type CostsWording,
  addCosts,
  addPaymentTerm,
  addPossessionDeadline,
  caseManCosts,
  date,
  hasCosts,
  money,
  partyLabels,
  selected,
  sentenceCase,
  value,
  values,
} from './common';

export function addOutrightClauses(list: OrderedListBuilder, data: OrderData): void {
  const address = data.propertyAddress || '[property address not provided]';
  const { claimant, defendant } = partyLabels(data);
  const costs: CostsWording = { ...caseManCosts(claimant, defendant), missing: '[costs order not provided]' };
  const options = values(data, 'outright-options');
  const sections = options.includes('money-judgment') ? values(data, 'outright-mj-sections') : [];
  const plans = sections.includes('payment-plan') ? values(data, 'outright-mj-plan') : [];

  const possession = value(data, 'outright-possession');
  if (possession) {
    list.item('possession', content => {
      content
        .text(`${sentenceCase(defendant)} must leave and give up possession of `)
        .fact('address', address)
        .text(` to ${claimant} `);
      if (possession === 'forthwith') {
        content.fact('deadline', 'immediately', { sourceId: 'outright-possession' });
      } else {
        content.text('on or before ');
        addPossessionDeadline(content, data, 'deadline', 'outright-by-date', 'outright-by-time');
      }
      content.text('.');
    });
  }
  const groundsType = value(data, 'outright-grounds-type');
  if (groundsType) {
    list.item('grounds', content => {
      const details = value(data, 'outright-grounds-details');
      content
        .text('This order for possession was made on ')
        .fact('type', groundsType, { sourceId: 'outright-grounds-type' })
        .text(' grounds');
      if (details) {
        content.text(', namely ').fact('details', details, { sourceId: 'outright-grounds-details' });
      }
      content.text('.');
    });
  }
  if (sections.includes('arrears')) {
    list.item('money-judgment', content => {
      const arrears = parseMoney(value(data, 'outright-mj-arrears'));
      const interestText = value(data, 'outright-mj-interest');
      const interest = parseMoney(interestText);
      // Interest the judge gave but the order cannot read leaves the total unknown, not the arrears alone.
      const total =
        arrears !== undefined && (!interestText || interest !== undefined)
          ? formatMoney(arrears + (interest ?? 0))
          : AMOUNT_NOT_PROVIDED;
      content
        .text(`There is judgment for ${claimant} against ${defendant} in the sum of £`)
        .fact('amount', total, { sourceId: 'outright-mj-amounts' })
        .text('.');
    });
  }
  if (options.includes('use-occupation')) {
    list.item('use-occupation', content => {
      content
        .fact('defendants', sentenceCase(defendant))
        .text(' must pay to ')
        .fact('claimants', claimant)
        .text(' £')
        .fact('rate', money(value(data, 'outright-use-occupation-rate')), {
          sourceId: 'outright-use-occupation-rate',
        })
        .text(' per day for damages for use and occupation from ')
        .fact('date', date(data, 'outright-use-occupation-from-date'), {
          sourceId: 'outright-use-occupation-from-date',
        })
        .text(` until possession of the property is given to ${claimant}.`);
    });
  }
  if (hasCosts(data, costs)) {
    list.item('costs', content => addCosts(content, data, costs));
  }
  if (plans.includes('lump') || plans.includes('instalments')) {
    list.item('payment-terms', content => {
      content.text(`The sums ordered above are to be paid by ${defendant} to ${claimant} `);
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
}
