import type { Page, TestInfo } from '@playwright/test';
import * as allure from 'allure-js-commons';
import { ContentType, Status } from 'allure-js-commons';

import { enable_error_message_validation_new } from '../../../../playwright.config';

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
  outcome: 'SKIPPED' | 'PASSED' | 'FAILED';
  skipReason?: string;
  error?: string;
};

export type CreateSoftEmvRunnerOptions = {
  /** When set, each row records the current URL for the Allure / attachment report. */
  page?: Page;
};

/**
 * Optional PFT error-message checks that do not stop the journey; failures are collected
 * and thrown once from `assertFailedStepsAtEnd`.
 *
 * Each check is written to Allure as its own step (page key, URL, outcome). A Markdown + JSON
 * summary is attached at the end via `assertFailedStepsAtEnd`.
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
    const tableHeader = '| Page (PFT key) | URL | Outcome | Details |\n| --- | --- | --- | --- |\n';
    const tableBody = journeyRows
      .map(r => {
        const detail =
          r.outcome === 'FAILED'
            ? (r.error ?? '').replace(/\|/g, '\\|').replace(/\n/g, '<br>')
            : r.outcome === 'SKIPPED'
              ? (r.skipReason ?? '').replace(/\|/g, '\\|')
              : "PFT completed without throwing (see nested steps for each `performValidation('errorMessage', …)`).";
        const url = (r.pageUrl ?? '—').replace(/\|/g, '\\|');
        return `| ${r.pageKey} | ${url} | ${r.outcome} | ${detail} |`;
      })
      .join('\n');

    const md = `# EMV journey summary\n\n${tableHeader}${tableBody}\n`;
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

  /** Runs a PFT when ENABLE_ERROR_MESSAGES_VALIDATION_NEW is true; swallows errors and records them for the end assert. */
  async function runSoftPftCheck(step: string, pft: () => Promise<void>): Promise<void> {
    const pageUrl = currentUrl();
    const stepTitle = `EMV — ${titleCaseStep(step)}`;

    await allure.step(stepTitle, async ctx => {
      await ctx.parameter('PFT / page key', step);
      if (pageUrl) {
        await ctx.parameter('Browser URL', pageUrl);
      }

      if (enable_error_message_validation_new !== 'true') {
        const skipReason = 'ENABLE_ERROR_MESSAGES_VALIDATION_NEW is not "true" — EMV not executed.';
        await ctx.parameter('Outcome', 'SKIPPED');
        await ctx.parameter('Note', skipReason);
        journeyRows.push({ pageKey: step, pageUrl, outcome: 'SKIPPED', skipReason });
        await allure.logStep('EMV skipped (flag off)', Status.SKIPPED);
        return;
      }

      await ctx.parameter(
        'What is validated',
        "PFT `*ErrorValidation` exercises mandatory fields / error summary via `performValidation('errorMessage', { header, message })` (see nested Playwright steps below this step)."
      );

      try {
        await pft();
        await ctx.parameter('Outcome', 'PASSED');
        journeyRows.push({ pageKey: step, pageUrl, outcome: 'PASSED' });
        await allure.logStep('PFT completed without throwing', Status.PASSED);
      } catch (err) {
        const error = err instanceof Error ? `${err.message}\n${err.stack ?? ''}` : String(err);
        failures.push({ step, error });
        journeyRows.push({ pageKey: step, pageUrl, outcome: 'FAILED', error });
        await ctx.parameter('Outcome', 'FAILED');
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
