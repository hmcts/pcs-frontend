/**
 * Soft EMV: controller records steps via `appendEmvStepCaptureLine` during a PFT → one Allure step per screen
 * (PFT key, URL, **EMV detail**) → red step + continue on failure → `assertFailedStepsAtEnd` attaches summary + throws if needed.
 */
import type { Page, TestInfo } from '@playwright/test';
import { type StepContext, step as allureStep } from 'allure-js-commons';

import { enable_error_message_validation_new } from '../../../../playwright.config';
import { ErrorMessageValidation, type ErrorMessageValidationSnapshot } from '../utils/validations/custom-validations';

let captureOn = false;
const captured: string[] = [];

export function appendEmvStepCaptureLine(line: string): void {
  if (captureOn) {
    captured.push(line);
  }
}

function beginCapture(): void {
  captureOn = true;
  captured.length = 0;
}

function endCapture(): string[] {
  captureOn = false;
  return captured.slice();
}

class SoftEmvStepFailed extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SoftEmvStepFailed';
  }
}

function prettyKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim();
}

/** Escape cell text for markdown tables. */
function cell(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function errText(thrown: unknown): string {
  return thrown instanceof Error ? `${thrown.message}\n${thrown.stack ?? ''}` : String(thrown);
}

/** Numbered `### Title` section, or empty string. */
function section(title: string, lines: string[]): string {
  if (!lines.length) {
    return '';
  }
  return `### ${title}\n${lines.map((line, i) => `${i + 1}. ${line}`).join('\n')}`;
}

/** One Allure `EMV detail` string from captured controller lines + error-message snapshots. */
function emvDetail(capturedLines: string[], snapshots: ErrorMessageValidationSnapshot[]): string {
  const actions: string[] = [];
  const validations: string[] = [];
  for (const line of capturedLines) {
    (line.startsWith('Validated ') ? validations : actions).push(line);
  }
  const errorLines = snapshots.map(
    (r, i) => `${r.pageName || `row ${i + 1}`}: ${r.passed ? 'pass' : 'FAIL'} — ${r.expected}`
  );
  return [section('Actions', actions), section('Validations', validations), section('Error message checks', errorLines)]
    .filter(Boolean)
    .join('\n\n')
    .slice(0, 15000);
}

async function allureParams(ctx: StepContext, pageKey: string, url: string | undefined, detail: string): Promise<void> {
  await ctx.parameter('PFT / page key', pageKey);
  if (url) {
    await ctx.parameter('URL', url);
  }
  if (detail) {
    await ctx.parameter('EMV detail', detail);
  }
}

export type CreateSoftEmvRunnerOptions = { page?: Page };

export function createSoftEmvRunner(testInfo: TestInfo, options?: CreateSoftEmvRunnerOptions) {
  const page = options?.page;
  const failures: { pageKey: string; error: string }[] = [];
  type Row = {
    pageKey: string;
    pageUrl?: string;
    pageUrlAfter?: string;
    outcome: 'SKIPPED' | 'PASSED' | 'FAILED';
    note?: string;
    error?: string;
  };
  const journey: Row[] = [];

  const urlNow = (): string | undefined => {
    try {
      return page?.url();
    } catch {
      return undefined;
    }
  };

  async function markReadOnlyNoEmv(pageKey: string, note?: string): Promise<void> {
    const url = urlNow();
    const skip =
      note ?? 'Read-only / informational screen — no field error validation.';
    await allureStep(`No EMV — ${prettyKey(pageKey)} (read-only)`, async ctx => {
      await allureParams(ctx, pageKey, url, '');
      journey.push({ pageKey, pageUrl: url, outcome: 'SKIPPED', note: skip });
    });
  }

  async function runSoftPftCheck(pageKey: string, pft: () => Promise<void>): Promise<void> {
    const url0 = urlNow();
    try {
      await allureStep(`EMV — ${prettyKey(pageKey)}`, async ctx => {
        if (enable_error_message_validation_new !== 'true') {
          await allureParams(ctx, pageKey, url0, '');
          journey.push({
            pageKey,
            pageUrl: url0,
            outcome: 'SKIPPED',
            note: 'ENABLE_ERROR_MESSAGES_VALIDATION_NEW is not "true".',
          });
          return;
        }

        const i0 = ErrorMessageValidation.peekResultsLength();
        beginCapture();
        let thrown: unknown;
        try {
          await pft();
        } catch (e) {
          thrown = e;
        }
        const lines = endCapture();
        const snaps = ErrorMessageValidation.getResultsSliceSince(i0);
        await allureParams(ctx, pageKey, url0, emvDetail(lines, snaps));

        const url1 = urlNow();
        const badMsg = snaps.some(s => !s.passed);

        if (!thrown && !badMsg) {
          journey.push({ pageKey, pageUrl: url0, pageUrlAfter: url1, outcome: 'PASSED' });
          return;
        }

        const msg = thrown
          ? errText(thrown)
          : snaps
              .filter(s => !s.passed)
              .map(s => `${s.pageName || pageKey}: ${s.expected}`)
              .join('\n');
        failures.push({ pageKey, error: msg });
        journey.push({ pageKey, pageUrl: url0, pageUrlAfter: url1, outcome: 'FAILED', error: msg });
        throw new SoftEmvStepFailed(msg);
      });
    } catch (e) {
      if (e instanceof SoftEmvStepFailed) {
        console.warn(`[EMV] ${pageKey}:\n${e.message}`);
        return;
      }
      throw e;
    }
  }

  async function readOnlyThen(pageKey: string, next: () => Promise<void>, note?: string): Promise<void> {
    await markReadOnlyNoEmv(pageKey, note);
    await next();
  }

  async function emvThen(pageKey: string, pft: () => Promise<void>, next: () => Promise<void>): Promise<void> {
    await runSoftPftCheck(pageKey, pft);
    await next();
  }

  async function assertFailedStepsAtEnd(): Promise<void> {
    const header = '| Page | URL (start) | URL (end) | Result | Note |\n| --- | --- | --- | --- | --- |\n';
    const rows = journey
      .map(
        r =>
          `| ${r.pageKey} | ${cell(r.pageUrl ?? '—')} | ${cell(r.pageUrlAfter ?? '—')} | ${r.outcome} | ${
            r.outcome === 'FAILED'
              ? cell((r.error ?? '').slice(0, 500))
              : r.outcome === 'SKIPPED'
                ? cell(r.note ?? '')
                : '—'
          } |`
      )
      .join('\n');
    const md = `# EMV journey\n\nSee **EMV detail** on each **EMV — …** step in Allure.\n\n${header}${rows}\n`;
    try {
      await testInfo.attach('emv-journey-summary.md', { body: md, contentType: 'text/markdown' });
    } catch {
      /* ignore */
    }

    if (!failures.length) {
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
