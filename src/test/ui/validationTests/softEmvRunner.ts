import type { Page, TestInfo } from '@playwright/test';
import * as allure from 'allure-js-commons';
import { Status } from 'allure-js-commons';

import { enable_error_message_validation_new } from '../../../../playwright.config';
import { ErrorMessageValidation, type ErrorMessageValidationSnapshot } from '../utils/validations/custom-validations';

import type { EmvExpectedAssertion, EmvStepReportDetail } from './emvReport.types';
import { startEmvStepCapture, stopEmvStepCapture } from './emvStepCapture';

function titleCaseStep(step: string): string {
  const spaced = step.replace(/([A-Z])/g, ' $1').replace(/[-_]/g, ' ');
  return spaced.replace(/\b\w/g, c => c.toUpperCase()).trim();
}

function mdCell(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

export type EmvJourneyRow = {
  pageKey: string;
  pageUrl?: string;
  pageUrlAfter?: string;
  outcome: 'SKIPPED' | 'PASSED' | 'FAILED';
  skipReason?: string;
  error?: string;
  report?: EmvStepReportDetail;
};

export type CreateSoftEmvRunnerOptions = {
  page?: Page;
};

function partitionCaptured(lines: string[]): { actions: string[]; validations: string[] } {
  const actions: string[] = [];
  const validations: string[] = [];
  for (const line of lines) {
    (line.startsWith('Validated ') ? validations : actions).push(line);
  }
  return { actions, validations };
}

function buildAutoReport(
  pageKey: string,
  captured: string[],
  errorRows: ErrorMessageValidationSnapshot[]
): EmvStepReportDetail {
  const { actions, validations } = partitionCaptured(captured);
  const expectedAssertions: EmvExpectedAssertion[] | undefined =
    errorRows.length > 0
      ? errorRows.map((r, i) => {
          const c = r.expected.indexOf(': ');
          return {
            label: `${r.pageName || `Error ${i + 1}`} (${r.passed ? 'pass' : 'fail'})`,
            summaryTitle: c > 0 ? r.expected.slice(0, c) : undefined,
            messageContains: c > 0 ? r.expected.slice(c + 2) : r.expected,
          };
        })
      : undefined;

  return {
    intent: `EMV **${titleCaseStep(pageKey)}** (\`${pageKey}\`)`,
    actionsOrInputs: actions.length ? actions : undefined,
    validationSteps: validations.length ? validations : undefined,
    expectedAssertions,
  };
}

async function applyAllureReport(
  ctx: { parameter: (n: string, v: string) => void | PromiseLike<void> },
  d: EmvStepReportDetail
): Promise<void> {
  await ctx.parameter('Overview', d.intent.slice(0, 500));
  if (d.screenTitle) {
    await ctx.parameter('Screen title', d.screenTitle.slice(0, 500));
  }
  if (d.actionsOrInputs?.length) {
    await ctx.parameter(
      'Actions (performAction)',
      d.actionsOrInputs
        .map((a, i) => `${i + 1}. ${a}`)
        .join('\n')
        .slice(0, 4000)
    );
  }
  if (d.validationSteps?.length) {
    await ctx.parameter(
      'Validations (performValidation)',
      d.validationSteps
        .map((v, i) => `${i + 1}. ${v}`)
        .join('\n')
        .slice(0, 4000)
    );
  }
  if (d.expectedAssertions?.length) {
    await ctx.parameter(
      'Error message checks',
      d.expectedAssertions
        .map((e, i) => `${i + 1}. ${e.label}${e.messageContains ? ` — ${e.messageContains}` : ''}`)
        .join('\n')
        .slice(0, 4000)
    );
  }
}

/**
 * Soft EMV: failures collected; `assertFailedStepsAtEnd` throws once if any failed.
 * Each PFT → one `allure.step`; parameters are auto-filled from `performAction` / `performValidation` capture
 * and `ErrorMessageValidation` rows during the PFT (no extra report objects — write PFTs like on master).
 */
export function createSoftEmvRunner(testInfo: TestInfo, options?: CreateSoftEmvRunnerOptions) {
  const { page } = options ?? {};
  const failures: { step: string; error: string }[] = [];
  const journeyRows: EmvJourneyRow[] = [];

  function currentUrl(): string | undefined {
    try {
      return page?.url();
    } catch {
      return undefined;
    }
  }

  async function attachJourneySummary(): Promise<void> {
    const header =
      '| Page key | URL before | URL after | Outcome | Overview | Notes |\n| --- | --- | --- | --- | --- | --- |\n';
    const body = journeyRows
      .map(r => {
        const note =
          r.outcome === 'FAILED'
            ? mdCell((r.error ?? '').slice(0, 300))
            : r.outcome === 'SKIPPED'
              ? mdCell(r.skipReason ?? '')
              : '—';
        return `| ${r.pageKey} | ${mdCell(r.pageUrl ?? '—')} | ${mdCell(r.pageUrlAfter ?? '—')} | ${r.outcome} | ${mdCell((r.report?.intent ?? '—').slice(0, 80))} | ${note} |`;
      })
      .join('\n');
    const md = `# EMV journey summary\n\n${header}${body}\n`;
    try {
      await testInfo.attach('emv-journey-summary.md', { body: md, contentType: 'text/markdown' });
    } catch {
      /* ignore */
    }
  }

  /**
   * Informational / read-only screen: no field-level EMV. Shows as a skipped Allure step and a row in
   * `emv-journey-summary.md` so the report does not look like a missing PFT.
   */
  async function markReadOnlyNoEmv(pageKey: string, note?: string): Promise<void> {
    const pageUrl = currentUrl();
    const title = `No EMV — ${titleCaseStep(pageKey)} (read-only)`;
    const skipReason = note ?? 'Read-only / informational screen — no field error validation.';
    const report: EmvStepReportDetail = {
      intent: `**Read-only** — \`${pageKey}\` (no EMV)`,
    };

    await allure.step(title, async ctx => {
      await ctx.parameter('PFT / page key', pageKey);
      await ctx.parameter('EMV', 'Not applicable');
      await ctx.parameter('Note', skipReason);
      if (pageUrl) {
        await ctx.parameter('URL', pageUrl);
      }
      journeyRows.push({ pageKey, pageUrl, outcome: 'SKIPPED', skipReason, report });
      await allure.logStep('EMV not applicable', Status.SKIPPED);
    });
  }

  async function runSoftPftCheck(step: string, pft: () => Promise<void>): Promise<void> {
    const pageUrl = currentUrl();
    const title = `EMV — ${titleCaseStep(step)}`;

    await allure.step(title, async ctx => {
      await ctx.parameter('PFT / page key', step);
      if (pageUrl) {
        await ctx.parameter('URL before', pageUrl);
      }

      if (enable_error_message_validation_new !== 'true') {
        const effective = buildAutoReport(step, [], []);
        await applyAllureReport(ctx, effective);
        const skipReason = 'ENABLE_ERROR_MESSAGES_VALIDATION_NEW is not "true".';
        await ctx.parameter('Outcome', 'SKIPPED');
        await ctx.parameter('Note', skipReason);
        journeyRows.push({ pageKey: step, pageUrl, outcome: 'SKIPPED', skipReason, report: effective });
        await allure.logStep('EMV skipped', Status.SKIPPED);
        return;
      }

      const resultsStart = ErrorMessageValidation.peekResultsLength();
      startEmvStepCapture();
      let captured: string[];
      let thrown: unknown;
      try {
        await pft();
      } catch (e) {
        thrown = e;
      } finally {
        captured = stopEmvStepCapture();
      }

      const errorSlice = ErrorMessageValidation.getResultsSliceSince(resultsStart);
      const effective = buildAutoReport(step, captured, errorSlice);
      await applyAllureReport(ctx, effective);

      if (!thrown) {
        const after = currentUrl();
        await ctx.parameter('Outcome', 'PASSED');
        await ctx.parameter('URL after', after ?? '—');
        journeyRows.push({ pageKey: step, pageUrl, pageUrlAfter: after, outcome: 'PASSED', report: effective });
      } else {
        const err = thrown;
        const msg = err instanceof Error ? `${err.message}\n${err.stack ?? ''}` : String(err);
        const after = currentUrl();
        failures.push({ step, error: msg });
        journeyRows.push({
          pageKey: step,
          pageUrl,
          pageUrlAfter: after,
          outcome: 'FAILED',
          error: msg,
          report: effective,
        });
        await ctx.parameter('Outcome', 'FAILED');
        await ctx.parameter('URL after', after ?? '—');
        await ctx.parameter('Failure (truncated)', msg.slice(0, 4000));
        await allure.logStep('PFT failed (continues)', Status.FAILED, err instanceof Error ? err : new Error(msg));
        console.warn(`[EMV] "${step}":\n${msg}`);
      }
    });
  }

  async function assertFailedStepsAtEnd(): Promise<void> {
    await attachJourneySummary();
    if (failures.length === 0) {
      return;
    }
    const summary = failures.map(f => `## ${f.step}\n${f.error}`).join('\n\n');
    try {
      await testInfo.attach('emv-failures-summary.txt', { body: summary, contentType: 'text/plain' });
    } catch {
      /* ignore */
    }
    throw new Error(
      `${failures.length} EMV step(s) failed — see Allure EMV steps, emv-journey-summary.md, emv-failures-summary.txt.`
    );
  }

  return { runSoftPftCheck, markReadOnlyNoEmv, assertFailedStepsAtEnd };
}
