import type { Page, TestInfo } from '@playwright/test';
import * as allure from 'allure-js-commons';
import { ContentType, Status } from 'allure-js-commons';

import { enable_error_message_validation_new } from '../../../../playwright.config';

import type { EmvStepReportDetail } from './emvReport.types';

export type { EmvExpectedAssertion, EmvStepReportDetail } from './emvReport.types';

function attachmentSlug(step: string): string {
  return `emv-${step.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
}

function titleCaseStep(step: string): string {
  const spaced = step.replace(/([A-Z])/g, ' $1').replace(/[-_]/g, ' ');
  return spaced.replace(/\b\w/g, c => c.toUpperCase()).trim();
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
  /** When set, each row records the current URL for the Allure / attachment report. */
  page?: Page;
};

function renderStepMarkdown(
  step: string,
  pageUrl: string | undefined,
  pageUrlAfter: string | undefined,
  outcome: string,
  details: EmvStepReportDetail | undefined,
  error?: string
): string {
  const lines: string[] = [];
  lines.push(`# EMV — ${titleCaseStep(step)}`);
  lines.push('');
  lines.push('## Where');
  lines.push(`- **PFT / page key:** \`${step}\``);
  lines.push(`- **URL before step:** ${pageUrl ?? '—'}`);
  lines.push(`- **URL after PFT:** ${pageUrlAfter ?? '—'}`);
  lines.push(`- **Outcome:** ${outcome}`);
  lines.push('');

  if (details?.screenTitle) {
    lines.push('## Screen');
    lines.push(`- ${details.screenTitle}`);
    lines.push('');
  }

  lines.push('## Intent');
  lines.push(details?.intent ?? '_No report detail supplied — infer from nested Playwright steps._');
  lines.push('');

  if (details?.actionsOrInputs?.length) {
    lines.push('## Actions / data entered (as exercised by PFT)');
    details.actionsOrInputs.forEach((a, i) => lines.push(`${i + 1}. ${a}`));
    lines.push('');
  }

  if (details?.expectedAssertions?.length) {
    lines.push('## Validations (error summary)');
    details.expectedAssertions.forEach((ex, i) => {
      lines.push(`### ${i + 1}. ${ex.label}`);
      if (ex.summaryTitle) {
        lines.push(`- **Summary title:** ${ex.summaryTitle}`);
      }
      if (ex.messageContains) {
        lines.push(`- **Expected message:** ${ex.messageContains}`);
      }
    });
    lines.push('');
  }

  if (error) {
    lines.push('## Failure');
    lines.push('```');
    lines.push(error);
    lines.push('```');
  }

  lines.push('---');
  lines.push(
    '_Nested `test.step` entries under this test show each `performAction` / `performValidation` from the PFT._'
  );
  return lines.join('\n');
}

async function attachStepMarkdown(testInfo: TestInfo, step: string, body: string): Promise<void> {
  const name = `${attachmentSlug(step)}-report.md`;
  try {
    await testInfo.attach(name, { body, contentType: 'text/markdown' });
  } catch {
    /* ignore */
  }
  try {
    await allure.attachment(name, body, { contentType: 'text/markdown' });
  } catch {
    /* ignore */
  }
}

async function applyReportToAllure(
  ctx: { parameter: (n: string, v: string) => void | PromiseLike<void> },
  details: EmvStepReportDetail | undefined
): Promise<void> {
  if (!details) {
    await ctx.parameter(
      'Report detail',
      'None — add optional 3rd argument to runSoftPftCheck(step, pft, { intent, actionsOrInputs, expectedAssertions, … }) for a richer Allure / Markdown report.'
    );
    return;
  }

  await ctx.parameter('Intent', details.intent.slice(0, 500));
  if (details.screenTitle) {
    await ctx.parameter('Screen title', details.screenTitle.slice(0, 500));
  }
  if (details.actionsOrInputs?.length) {
    await ctx.parameter('Actions / inputs', details.actionsOrInputs.join(' → ').slice(0, 900));
  }
  if (details.expectedAssertions?.length) {
    const summary = details.expectedAssertions
      .map((e, i) => `${i + 1}. ${e.label}${e.messageContains ? `: “${e.messageContains}”` : ''}`)
      .join(' | ');
    await ctx.parameter('Expected checks', summary.slice(0, 900));
  }
}

/**
 * Optional PFT error-message checks that do not stop the journey; failures are collected
 * and thrown once from `assertFailedStepsAtEnd`.
 *
 * Pass optional **report** metadata as the 3rd argument to `runSoftPftCheck` for detailed Allure
 * parameters and per-step Markdown attachments, plus a richer journey summary.
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
    const tableHeader =
      '| Page key | URL (before) | URL (after) | Outcome | Intent (short) | Failure / skip |\n| --- | --- | --- | --- | --- | --- |\n';
    const tableBody = journeyRows
      .map(r => {
        const shortIntent = (r.report?.intent ?? '—').replace(/\|/g, '\\|').replace(/\n/g, ' ').slice(0, 120);
        const failOrSkip =
          r.outcome === 'FAILED'
            ? (r.error ?? '').replace(/\|/g, '\\|').replace(/\n/g, '<br>').slice(0, 400)
            : r.outcome === 'SKIPPED'
              ? (r.skipReason ?? '').replace(/\|/g, '\\|')
              : '—';
        const u1 = (r.pageUrl ?? '—').replace(/\|/g, '\\|');
        const u2 = (r.pageUrlAfter ?? '—').replace(/\|/g, '\\|');
        return `| ${r.pageKey} | ${u1} | ${u2} | ${r.outcome} | ${shortIntent} | ${failOrSkip} |`;
      })
      .join('\n');

    const md = `# EMV journey summary\n\n${tableHeader}${tableBody}\n\nFull structured rows (including \`report\`) are in \`emv-journey-summary.json\`.\n`;
    const json = JSON.stringify(journeyRows, null, 2);

    try {
      await testInfo.attach('emv-journey-summary.md', { body: md, contentType: 'text/markdown' });
    } catch {
      /* ignore */
    }
    try {
      await testInfo.attach('emv-journey-summary.json', { body: json, contentType: 'application/json' });
    } catch {
      /* ignore */
    }

    try {
      await allure.attachment('emv-journey-summary.md', md, { contentType: 'text/markdown' });
      await allure.attachment('emv-journey-summary.json', json, ContentType.JSON);
    } catch {
      /* ignore */
    }
  }

  async function runSoftPftCheck(step: string, pft: () => Promise<void>, report?: EmvStepReportDetail): Promise<void> {
    const pageUrl = currentUrl();
    const stepTitle = `EMV — ${titleCaseStep(step)}`;

    await allure.step(stepTitle, async ctx => {
      await ctx.parameter('PFT / page key', step);
      if (pageUrl) {
        await ctx.parameter('Browser URL (before)', pageUrl);
      }
      await applyReportToAllure(ctx, report);

      if (enable_error_message_validation_new !== 'true') {
        const skipReason = 'ENABLE_ERROR_MESSAGES_VALIDATION_NEW is not "true" — EMV not executed.';
        await ctx.parameter('Outcome', 'SKIPPED');
        await ctx.parameter('Note', skipReason);
        journeyRows.push({ pageKey: step, pageUrl, outcome: 'SKIPPED', skipReason, report });
        await attachStepMarkdown(
          testInfo,
          step,
          renderStepMarkdown(step, pageUrl, undefined, 'SKIPPED', report, skipReason)
        );
        await allure.logStep('EMV skipped (flag off)', Status.SKIPPED);
        return;
      }

      try {
        await pft();
        const pageUrlAfter = currentUrl();
        await ctx.parameter('Outcome', 'PASSED');
        await ctx.parameter('Browser URL (after)', pageUrlAfter ?? '—');
        journeyRows.push({ pageKey: step, pageUrl, pageUrlAfter, outcome: 'PASSED', report });
        await attachStepMarkdown(testInfo, step, renderStepMarkdown(step, pageUrl, pageUrlAfter, 'PASSED', report));
      } catch (err) {
        const error = err instanceof Error ? `${err.message}\n${err.stack ?? ''}` : String(err);
        const pageUrlAfter = currentUrl();
        failures.push({ step, error });
        journeyRows.push({ pageKey: step, pageUrl, pageUrlAfter, outcome: 'FAILED', error, report });
        await ctx.parameter('Outcome', 'FAILED');
        await ctx.parameter('Browser URL (after failure)', pageUrlAfter ?? '—');
        await attachStepMarkdown(
          testInfo,
          step,
          renderStepMarkdown(step, pageUrl, pageUrlAfter, 'FAILED', report, error)
        );
        await allure.logStep(
          'PFT failed (journey continues)',
          Status.FAILED,
          err instanceof Error ? err : new Error(error)
        );
        console.warn(`[EMV] step "${step}" failed (journey continues):\n${error}`);
        try {
          await testInfo.attach(attachmentSlug(step), { body: error, contentType: 'text/plain' });
        } catch {
          /* ignore attach failures */
        }
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
      await testInfo.attach('emv-failures-summary', { body: summary, contentType: 'text/plain' });
    } catch {
      /* ignore */
    }
    try {
      await allure.attachment('emv-failures-summary.txt', summary, ContentType.TEXT);
    } catch {
      /* ignore */
    }
    throw new Error(
      `Error-message validation failed in ${failures.length} step(s) (see test attachments "emv-*", "emv-journey-summary.*", and Allure steps).`
    );
  }

  return { runSoftPftCheck, assertFailedStepsAtEnd };
}
