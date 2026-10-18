import { type OrderedListBuilder } from '@hmcts-cft/docweave';

import { type OrderData } from '../data';

import { selected, selectedControlId, value } from './common';

/**
 * Whether an order made without a hearing transfers enforcement of the possession order to the High Court, as
 * DJ Daley worded it. A possession order made at a hearing transfers it with its own option.
 */
export function transfersEnforcement(data: OrderData): boolean {
  return data.withoutHearing && selected(data, 'transfer-enforcement', 'yes');
}

/** The High Court's division or registry, without "District Registry" if the judge typed it after the name. */
function destination(data: OrderData): string {
  if (value(data, 'transfer-enforcement-court') === 'kings-bench') {
    return "King's Bench Division";
  }
  if (value(data, 'transfer-enforcement-court') === 'district-registry') {
    const registry = value(data, 'transfer-enforcement-registry').replace(/\s*district registry$/i, '');
    return registry ? `${registry} District Registry` : '[District Registry not provided]';
  }
  return "[King's Bench Division or District Registry not provided]";
}

export function addEnforcementTransfer(list: OrderedListBuilder, data: OrderData): void {
  list.item('enforcement-transfer', content => {
    content
      .text('Enforcement of the Order of Possession is transferred to the High Court, ')
      .fact('enforcement-transfer-court', destination(data), {
        sourceId:
          value(data, 'transfer-enforcement-court') === 'district-registry'
            ? 'transfer-enforcement-registry'
            : selectedControlId(data, 'transfer-enforcement-court'),
      })
      .text(', pursuant to section 42 of the County Courts Act 1984.');
  });
}
