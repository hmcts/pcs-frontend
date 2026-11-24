import { type OrderedListBuilder } from '@hmcts-cft/docweave';

import { registryName } from '../../../../utils/makeOrderFormat';
import { type OrderData } from '../data';

import { selected, selectedControlId, value } from './common';

/** The High Court's division or registry, without "District Registry" if the judge typed it after the name. */
function destination(data: OrderData): string {
  if (value(data, 'transfer-enforcement-court') === 'kings-bench') {
    return "King's Bench Division";
  }
  if (value(data, 'transfer-enforcement-court') === 'district-registry') {
    const registry = registryName(value(data, 'transfer-enforcement-registry'));
    return registry ? `${registry} District Registry` : '[District Registry not provided]';
  }
  return "[King's Bench Division or District Registry not provided]";
}

/**
 * Any order can transfer enforcement of the possession order to the High Court, with or without a hearing.
 */
export function addEnforcementTransfer(list: OrderedListBuilder, data: OrderData): void {
  if (!selected(data, 'transfer-enforcement', 'yes')) {
    return;
  }
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
