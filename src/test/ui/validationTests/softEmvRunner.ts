import type { Page, TestInfo } from '@playwright/test';
import { Status, type StepContext, step as allureStep, logStep } from 'allure-js-commons';

import { enable_error_message_validation_new } from '../../../../playwright.config';
import { ErrorMessageValidation, type ErrorMessageValidationSnapshot } from '../utils/validations/custom-validations';

import type { EmvExpectedAssertion, EmvStepReportDetail } from './emvReport.types';
import { startEmvStepCapture, stopEmvStepCapture } from './emvStepCapture';

const READ_ONLY_SKIP_DEFAULT = 'Read-only / informational screen — no field error validation.';
const EMV_DISABLED_REASON = 'ENABLE_ERROR_MESSAGES_VALIDATION_NEW is not "true".';

function titleCaseStep(key: string): string {
  const spaced = key.replace(/([A-Z])/g, ' $1').replace(/[-_]/g, ' ');
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

async function paramNumbered(ctx: StepContext, name: string, lines: string[] | undefined, maxLen = 4000): Promise<void> {
  if (!lines?.length) {
    return;
  }
  const body = lines.map((line, i) => `${i + 1}. ${line}`).join('\n').slice(0, maxLen);
  await ctx.parameter(name, body);
}

async function applyAllureReport(ctx: StepContext, d: EmvStepReportDetail): Promise<void> {
  await ctx.parameter('Overview', d.intent.slice(0, 500));
  if (d.screenTitle) {
    await ctx.parameter('Screen title', d.screenTitle.slice(0, 500));
  }
  await paramNumbered(ctx, 'Actions (performAction)', d.actionsOrInputs);
  await paramNumbered(ctx, 'Validations (performValidation)', d.validationSteps);
  if (d.expectedAssertions?.length) {
    const body = d.expectedAssertions
      .map((e, i) => `${i + 1}. ${e.label}${e.messageContains ? ` — ${e.messageContains}` : ''}`)
      .join('\n')
      .slice(0, 4000);
    await ctx.parameter('Error message checks', body);
  }
}

async function paramPageKeyAndUrl(ctx: StepContext, pageKey: string, pageUrl: string | undefined, urlParam: string): Promise<void> {
  await ctx.parameter('PFT / page key', pageKey);
  if (pageUrl) {
    await ctx.parameter(urlParam, pageUrl);
  }
}

function formatThrown(thrown: unknown): string {
  return thrown instanceof Error ? `${thrown.message}\n${thrown.stack ?? ''}` : String(thrown);
}

/**
 * Soft EMV: failures collected; `assertFailedStepsAtEnd` throws once if any failed.
 * Each PFT → one Allure `step`; parameters are auto-filled from `performAction` / `performValidation` capture
 * and `ErrorMessageValidation` rows during the PFT (no extra report objects — write PFTs like on master).
 */
export function createSoftEmvRunner(testInfo: TestInfo, options?: CreateSoftEmvRunnerOptions) {
  const { page } = options ?? {};
  const failures: { pageKey: string; error: string }[] = [];
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

  /** Read-only screen: no field-level EMV; one skipped Allure step + journey row. */
  async function markReadOnlyNoEmv(pageKey: string, note?: string): Promise<void> {
    const pageUrl = currentUrl();
    const skipReason = note ?? READ_ONLY_SKIP_DEFAULT;
    const report: EmvStepReportDetail = { intent: `**Read-only** — \`${pageKey}\` (no EMV)` };

    await allureStep(`No EMV — ${titleCaseStep(pageKey)} (read-only)`, async ctx => {
      await paramPageKeyAndUrl(ctx, pageKey, pageUrl, 'URL');
      await ctx.parameter('EMV', 'Not applicable');
      await ctx.parameter('Note', skipReason);
      await ctx.parameter('Outcome', 'SKIPPED');
      journeyRows.push({ pageKey, pageUrl, outcome: 'SKIPPED', skipReason, report });
    });
  }

  async function runSoftPftCheck(pageKey: string, pft: () => Promise<void>): Promise<void> {
    const pageUrl = currentUrl();

    await allureStep(`EMV — ${titleCaseStep(pageKey)}`, async ctx => {
      await paramPageKeyAndUrl(ctx, pageKey, pageUrl, 'URL before');

      if (enable_error_message_validation_new !== 'true') {
        const effective = buildAutoReport(pageKey, [], []);
        await applyAllureReport(ctx, effective);
        await ctx.parameter('Outcome', 'SKIPPED');
        await ctx.parameter('Note', EMV_DISABLED_REASON);
        journeyRows.push({ pageKey, pageUrl, outcome: 'SKIPPED', skipReason: EMV_DISABLED_REASON, report: effective });
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
      const effective = buildAutoReport(pageKey, captured, errorSlice);
      await applyAllureReport(ctx, effective);

      const after = currentUrl();
      const errorMessageValidationFailed = errorSlice.some(r => !r.passed);

      if (!thrown && !errorMessageValidationFailed) {
        await ctx.parameter('Outcome', 'PASSED');
        await ctx.parameter('URL after', after ?? '—');
        journeyRows.push({ pageKey, pageUrl, pageUrlAfter: after, outcome: 'PASSED', report: effective });
        return;
      }

      const msg = thrown
        ? formatThrown(thrown)
        : errorSlice
            .filter(r => !r.passed)
            .map(r => `${r.pageName || pageKey}: ${r.expected}`)
            .join('\n');
      const errForLog = thrown instanceof Error ? thrown : new Error(msg);
      failures.push({ pageKey, error: msg });
      journeyRows.push({ pageKey, pageUrl, pageUrlAfter: after, outcome: 'FAILED', error: msg, report: effective });
      await ctx.parameter('Outcome', 'FAILED');
      await ctx.parameter('URL after', after ?? '—');
      await ctx.parameter('Failure (truncated)', msg.slice(0, 4000));
      await logStep('PFT failed (continues)', Status.FAILED, errForLog);
      console.warn(`[EMV] "${pageKey}":\n${msg}`);
    });
  }

  /** `markReadOnlyNoEmv` then one continuation (same ordering as two separate awaits). */
  async function readOnlyThen(pageKey: string, continueWith: () => Promise<void>, note?: string): Promise<void> {
    await markReadOnlyNoEmv(pageKey, note);
    await continueWith();
  }

  /** `runSoftPftCheck` then one continuation (happy-path action after EMV). */
  async function emvThen(pageKey: string, pft: () => Promise<void>, continueWith: () => Promise<void>): Promise<void> {
    await runSoftPftCheck(pageKey, pft);
    await continueWith();
  }

  async function assertFailedStepsAtEnd(): Promise<void> {
    await attachJourneySummary();
    if (failures.length === 0) {
      return;
    }
    const summary = failures.map(f => `## ${f.pageKey}\n${f.error}`).join('\n\n');
    try {
      await testInfo.attach('emv-failures-summary.txt', { body: summary, contentType: 'text/plain' });
    } catch {
      /* ignore */
    }
    throw new Error(
      `${failures.length} EMV step(s) failed — see Allure EMV steps, emv-journey-summary.md, emv-failures-summary.txt.`
    );
  }

  return { runSoftPftCheck, markReadOnlyNoEmv, readOnlyThen, emvThen, assertFailedStepsAtEnd };
}
