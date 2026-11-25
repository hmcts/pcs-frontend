import { type OrderedListBuilder } from '@hmcts-cft/docweave';

import { type OrderData } from '../data';

import { selected } from './common';

/**
 * Any order can transfer enforcement of the possession order to the High Court, with or without a hearing, and
 * limit the costs of enforcing it there to a County Court bailiff's.
 */
export function addEnforcementTransfer(list: OrderedListBuilder, data: OrderData): void {
  if (!selected(data, 'transfer-enforcement', 'yes')) {
    return;
  }
  list.item('enforcement-transfer', content =>
    content.text(
      'Enforcement of the Order of Possession is transferred to the High Court pursuant to section 42 of the County ' +
        'Courts Act 1984.'
    )
  );
  // Starts "But" as it qualifies the transfer it always follows.
  if (selected(data, 'transfer-enforcement-costs', 'bailiff')) {
    list.item('enforcement-transfer-costs', content =>
      content.text(
        'But the Claimant shall not be entitled to recover from the Defendant any costs of enforcement by a High ' +
          'Court Enforcement Officer insofar as they exceed the costs of enforcement by a County Court bailiff.'
      )
    );
  }
}
