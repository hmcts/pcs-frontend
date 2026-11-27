import type { Request } from 'express';

import { createMakeAClaimStep, isRendering } from './formStep';
import type { SummaryCard } from './summary';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

interface SectionSummaryConfig {
  stepName: string;
  stepDir: string;
  cards: (req: Request) => SummaryCard[];
  /** Content for the page besides its cards, which are only built when the page is rendered. */
  extendGetContent?: (req: Request) => Record<string, unknown>;
}

/** The check your answers page that ends a section of the task list: its cards and a Save and continue. */
export function createSectionSummaryStep({
  stepName,
  stepDir,
  cards,
  extendGetContent,
}: SectionSummaryConfig): StepDefinition {
  return createMakeAClaimStep({
    stepName,
    stepDir,
    customTemplate: 'make-a-claim/templates/summary.njk',
    fields: [],
    extendGetContent: (req, formContent) => ({
      ...(isRendering(formContent) ? { cards: cards(req) } : {}),
      ...extendGetContent?.(req),
    }),
  });
}
