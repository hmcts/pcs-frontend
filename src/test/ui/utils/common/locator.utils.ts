import { Locator } from '@playwright/test';

import { SHORT_TIMEOUT } from '../../../../../playwright.config';

/**
 * Heading/legend elements that carry a question label in this app.
 *
 * `legend.govuk-fieldset__legend` is what `govukRadios` renders when a field declares
 * `legendClasses` (see src/main/modules/steps/formBuilder/componentBuilders.ts), while
 * `p.govuk-fieldset__legend` is the hand-rolled variant used by pages such as
 * universalCredit.njk and languageUsed.njk.
 */
export const QUESTION_LABEL_SELECTOR = [
  'legend.govuk-fieldset__legend',
  'p.govuk-fieldset__legend',
  'h1.govuk-fieldset__heading',
  'p.govuk-heading-m',
  'h2.govuk-heading-m',
  'h1.govuk-heading-l',
].join(', ');

/**
 * Combines candidate locators into one locator that matches whichever candidate is present.
 *
 * Each candidate is narrowed with `.first()` so the combined locator stays strict-mode safe;
 * it is only ever used to *wait*, never to decide which candidate to act on.
 */
export function anyOf(...locators: Locator[]): Locator {
  if (locators.length === 0) {
    throw new Error('anyOf requires at least one locator');
  }
  return locators
    .map(locator => locator.first())
    .reduce((combined, next) => combined.or(next))
    .first();
}

/**
 * Best-effort wait for `locator` to be visible, used to let the DOM settle *before* a
 * non-retrying probe such as `count()`, `isVisible()` or `textContent()`.
 *
 * Playwright actions (`click`, `check`, `fill`, `selectOption`) already auto-wait for
 * actionability, but the probes above snapshot the DOM instantly. After a server-rendered
 * navigation those probes can therefore read the *previous* page and steer the caller down
 * the wrong branch — which then burns the full action timeout on a locator that will never
 * resolve. This helper closes that gap.
 *
 * A timeout here is deliberately swallowed: the caller's subsequent action still auto-waits,
 * so this can only ever add readiness, never remove it.
 */
export async function waitForInteractive(locator: Locator, timeout: number = SHORT_TIMEOUT): Promise<void> {
  await locator
    .first()
    .waitFor({ state: 'visible', timeout })
    .catch(() => {
      /* fall through - the caller's action auto-waits and reports the real failure */
    });
}
