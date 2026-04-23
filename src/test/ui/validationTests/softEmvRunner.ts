import type { TestInfo } from '@playwright/test';

import { enable_error_message_validation_new } from '../../../../playwright.config';

function attachmentSlug(step: string): string {
  return `emv-${step.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
}

/**
 * Optional PFT error-message checks that do not stop the journey; failures are collected
 * and thrown once from `assertFailedStepsAtEnd`.
 */
export function createSoftEmvRunner(testInfo: TestInfo) {
  const failures: { step: string; error: string }[] = [];

  /** Runs a PFT when ENABLE_ERROR_MESSAGES_VALIDATION=true; swallows errors and records them for the end assert. */
  async function runSoftPftCheck(step: string, pft: () => Promise<void>): Promise<void> {
    if (enable_error_message_validation_new !== 'true') {
      return;
    }
    try {
      await pft();
    } catch (err) {
      const error = err instanceof Error ? `${err.message}\n${err.stack ?? ''}` : String(err);
      failures.push({ step, error });
      console.warn(`[EMV] step "${step}" failed (journey continues):\n${error}`);
      try {
        await testInfo.attach(attachmentSlug(step), { body: error, contentType: 'text/plain' });
      } catch {
        /* ignore attach failures */
      }
    }
  }

  async function assertFailedStepsAtEnd(): Promise<void> {
    if (failures.length === 0) {
      return;
    }
    const summary = failures.map(f => `## ${f.step}\n${f.error}`).join('\n\n');
    try {
      await testInfo.attach('emv-failures-summary', { body: summary, contentType: 'text/plain' });
    } catch {
      /* ignore */
    }
    throw new Error(
      `Error-message validation failed in ${failures.length} step(s) (see test attachments "emv-*" and console).`
    );
  }

  return { runSoftPftCheck, assertFailedStepsAtEnd };
}
