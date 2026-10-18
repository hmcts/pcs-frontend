import { type DocWeaveDocument, buildDoc } from '@hmcts-cft/docweave';

import { type OrderData } from '../data';

import {
  addCosts,
  addPaymentTerm,
  addPreamble,
  caseManCosts,
  date,
  hasCosts,
  joinList,
  partyLabels,
  sentenceCase,
  value,
  values,
} from './common';
import { addEnforcementTransfer, transfersEnforcement } from './enforcement-transfer';
import { addListing } from './listing';

const SUBJECTS: Record<string, string> = {
  claim: 'the claim',
  counterclaim: 'the counterclaim',
  application: 'the application',
};

export function buildAdjournmentOrder(data: OrderData): DocWeaveDocument {
  const type = value(data, 'adj-type');
  const { claimant, defendant, defendantVerb } = partyLabels(data);
  const conditions = values(data, 'adj-gen');
  const costs = caseManCosts(claimant, defendant);
  const chosen = values(data, 'adj-subjects').filter(subject => SUBJECTS[subject]);
  const subject = joinList(chosen.map(key => SUBJECTS[key])) || SUBJECTS.claim;
  const is = chosen.length > 1 ? 'are' : 'is';
  const transferred = transfersEnforcement(data);

  return buildDoc(order => {
    addPreamble(order, data);
    if (!type && !transferred) {
      return;
    }
    order.orderedList('adjournment-clauses', list => {
      if (type === 'further-hearing') {
        addListing(list, data, 'adj', 'adjournment', `${sentenceCase(subject)} shall be adjourned to be heard`);
      } else if (type) {
        const instalments = ['current-rent-plus', 'payments'].find(option => conditions.includes(option));
        const restore = conditions.includes('restore');
        if (instalments || conditions.includes('oneoff')) {
          const payments =
            instalments === 'current-rent-plus'
              ? 'payment of current rent as it falls due together with the following payments towards any arrears:'
              : 'the following payments towards any arrears:';
          list.item(
            'adjournment-condition',
            `${sentenceCase(subject)} ${is} adjourned generally on condition that ${defendant} ${defendantVerb('makes', 'make')} ${payments}`,
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
            `${sentenceCase(claimant)} may apply to restore ${subject} if there is a breach of such condition or conditions. This application shall be made on notice to all parties. ${sentenceCase(claimant)} shall set out in such application details of the alleged breach or breaches and attach any evidence relied upon in support.`
          );
          if (restore) {
            list.item('adjournment-strike-out', content => {
              content
                .text(`If no application to restore ${subject} is made by `)
                .fact('adjournment-restore-date', date(data, 'adj-gen-restore-date'), {
                  sourceId: 'adj-gen-restore-date',
                })
                .text(` ${subject} shall stand as struck out without further application or order of the court.`);
            });
          }
        } else {
          list.item('adjournment-generally', content => {
            content.text(
              `${sentenceCase(subject)} ${is} adjourned generally with liberty to restore by application by any party on notice to all other parties.`
            );
            if (restore) {
              content
                .text(' If no application is made by 4pm on ')
                .fact('adjournment-restore-date', date(data, 'adj-gen-restore-date'), {
                  sourceId: 'adj-gen-restore-date',
                })
                .text(
                  ` ${subject} shall automatically be struck out without the need for any further application or order.`
                );
            }
          });
        }
      }
      if (transferred) {
        addEnforcementTransfer(list, data);
      }
      if (hasCosts(data, costs)) {
        list.item('adjournment-costs', content => addCosts(content, data, costs));
      }
    });
  });
}
