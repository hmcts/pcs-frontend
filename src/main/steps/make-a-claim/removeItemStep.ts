import type { Request } from 'express';

import { readClaim } from './claimDraft';
import { itemIndexOf } from './claimMapping';
import { yesNoQuestion } from './fieldBuilders';
import { flowConfig } from './flow.config';
import { createMakeAClaimStep } from './formStep';

import { getStepUrl } from '@modules/steps/flow';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import type { CcdCollectionItem } from '@services/ccdCase.interface';
import type { CitizenPossessionClaim } from '@services/citizenPossessionClaim.interface';

interface RemoveItemConfig<T> {
  stepName: string;
  stepDir: string;
  /** The summary page the item is listed on, which the page returns to. */
  summaryStep: string;
  items: (claim: CitizenPossessionClaim) => CcdCollectionItem<T>[] | undefined;
  /** The name the page's content gives the item. */
  nameKey: string;
  displayName: (item: T | undefined, index: number, req: Request) => string;
}

/** A page asking whether to remove one defendant or additional claimant, named by ?id= or ?index=. */
export function createRemoveItemStep<T>({
  stepName,
  stepDir,
  summaryStep,
  items,
  nameKey,
  displayName,
}: RemoveItemConfig<T>): StepDefinition {
  const summaryUrl = (req: Request) => getStepUrl(summaryStep, flowConfig, req.res?.locals.validatedCase?.id);
  return createMakeAClaimStep({
    stepName,
    stepDir,
    interstitial: true,
    fields: [yesNoQuestion('confirmRemove')],
    redirectWhen: req => (itemIndexOf(req, items(readClaim(req))) === undefined ? summaryUrl(req) : undefined),
    extendGetContent: req => {
      const collection = items(readClaim(req));
      const index = itemIndexOf(req, collection) ?? -1;
      return {
        [nameKey]: displayName(collection?.[index]?.value, index, req),
        backUrl: summaryUrl(req),
      };
    },
    resolveRedirectAfterPost: async req => summaryUrl(req),
  });
}
