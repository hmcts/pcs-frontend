import type { Request } from 'express';

import { readClaim } from './claimDraft';
import { additionalClaimantAnswered, itemIndexFromQuery } from './claimMapping';
import { flowConfig } from './flow.config';
import { createMakeAClaimStep } from './formStep';

import { getStepUrl } from '@modules/steps/flow';
import type { BuiltFormContent, FormBuilderConfig } from '@modules/steps/formBuilder/formFieldConfig.interface';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import type { CitizenAdditionalClaimant } from '@services/citizenPossessionClaim.interface';

/** The step asked after the last additional claimant question, which asks whether there is another. */
const ASK_AGAIN = 'multiple-claimants';

type Config = Omit<FormBuilderConfig, 'journeyFolder' | 'flowConfig' | 'basePath' | 'stepDir'> & {
  stepDir: string;
  /** The step asked next about this claimant. */
  next: (claimant: CitizenAdditionalClaimant | undefined) => string;
  /** The step asked just before, which Back returns to. */
  previous: (claimant: CitizenAdditionalClaimant | undefined) => string;
};

const claimantOf = (req: Request): CitizenAdditionalClaimant | undefined =>
  readClaim(req).additionalClaimants?.[itemIndexFromQuery(req)]?.value;

/** The index of the claimant the page just saved, which is the last one when the request named one that did not exist. */
const savedIndexOf = (req: Request): number =>
  Math.max(0, Math.min(itemIndexFromQuery(req), (readClaim(req).additionalClaimants?.length ?? 0) - 1));

/** A page of the additional claimant questions, which are asked for one claimant at a time, named by ?index=. */
export function additionalClaimantUrl(req: Request, stepName: string, index = itemIndexFromQuery(req)): string {
  const url = getStepUrl(stepName, flowConfig, req.res?.locals.validatedCase?.id);
  return stepName === ASK_AGAIN ? url : `${url}?index=${index}`;
}

export function createAdditionalClaimantStep(config: Config): StepDefinition {
  const { next, previous, extendGetContent, ...stepConfig } = config;
  return createMakeAClaimStep({
    ...stepConfig,
    extendGetContent: async (req: Request, formContent: BuiltFormContent) => ({
      backUrl: additionalClaimantUrl(req, previous(claimantOf(req))),
      ...(extendGetContent ? await extendGetContent(req, formContent) : {}),
    }),
    keepsOwnRedirectOnReturn: req =>
      !additionalClaimantAnswered(readClaim(req).additionalClaimants?.[savedIndexOf(req)]?.value),
    resolveRedirectAfterPost: async req => {
      const index = savedIndexOf(req);
      return additionalClaimantUrl(req, next(readClaim(req).additionalClaimants?.[index]?.value), index);
    },
  });
}
