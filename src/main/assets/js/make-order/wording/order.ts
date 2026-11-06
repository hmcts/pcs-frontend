import { type DocWeaveDocument, type OrderedListBuilder, buildDoc } from '@hmcts-cft/docweave';

import { type MakeOrderType } from '../../../../utils/makeOrderValidation';
import { type OrderData } from '../data';

import { addAdjournmentClauses } from './adjournment';
import { addApplicationDecisions } from './application';
import { addCosts, addPreamble, caseManCosts, hasCosts, partyLabels } from './common';
import { addEnforcementTransfer, transfersEnforcement } from './enforcement-transfer';
import { addFreeFormClauses } from './free-form';
import { addOutrightClauses } from './outright';
import { addStrikeOutDismissalClauses } from './strike-out';
import { addSuspendedClauses } from './suspended';

/** What each order type orders on the claim. A possession order places its own costs among its clauses. */
const CLAIM_CLAUSES: Record<MakeOrderType, (list: OrderedListBuilder, data: OrderData) => void> = {
  OUTRIGHT_POSSESSION: addOutrightClauses,
  SUSPENDED_POSSESSION: addSuspendedClauses,
  ADJOURNMENT: addAdjournmentClauses,
  STRIKE_OUT_DISMISSAL: addStrikeOutDismissalClauses,
  FREE_FORM: addFreeFormClauses,
  NO_ORDER_ON_CLAIM: () => undefined,
};

const OWN_COSTS: readonly MakeOrderType[] = ['OUTRIGHT_POSSESSION', 'SUSPENDED_POSSESSION'];

/**
 * The order the form's answers make, one document whatever its type: the preamble, the claim's clauses, then each
 * application's. The claim's clauses are always one list, so switching type changes the clauses within it and keeps
 * whatever the judge wrote around them. An order that leaves the claim as it is orders the costs of the application,
 * after the decisions.
 */
export function buildOrder(type: MakeOrderType, data: OrderData): DocWeaveDocument {
  const { claimant, defendant } = partyLabels(data);
  const onClaim = type !== 'NO_ORDER_ON_CLAIM';
  const costs = caseManCosts(claimant, defendant, onClaim ? 'claim' : 'application');
  const ordersCosts = !OWN_COSTS.includes(type) && hasCosts(data, costs);

  return buildDoc(order => {
    addPreamble(order, data);
    order.orderedList('claim-clauses', list => {
      CLAIM_CLAUSES[type](list, data);
      if (transfersEnforcement(data)) {
        addEnforcementTransfer(list, data);
      }
      if (onClaim && ordersCosts) {
        list.item('costs', content => addCosts(content, data, costs));
      }
    });
    addApplicationDecisions(order, data);
    if (!onClaim && ordersCosts) {
      order.orderedList('application-costs-clauses', list =>
        list.item('application-costs', content => addCosts(content, data, costs))
      );
    }
  });
}
