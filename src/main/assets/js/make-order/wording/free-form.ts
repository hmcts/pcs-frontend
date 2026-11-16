import { type OrderedListBuilder } from '@hmcts-cft/docweave';

import { type OrderData } from '../data';

import { values } from './common';
import { addListing } from './listing';

/** The judge writes a free form order in the preview, after "IT IS ORDERED THAT:". Made without a hearing, it can list one. */
export function addFreeFormClauses(list: OrderedListBuilder, data: OrderData): void {
  if (data.withoutHearing && values(data, 'list-on-notice').includes('yes')) {
    addListing(list, data, 'list', 'free-form', 'The claim shall be listed for a hearing on notice to all parties');
  }
}
