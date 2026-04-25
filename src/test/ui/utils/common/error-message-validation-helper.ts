import { type StepContext, step as allureStep } from 'allure-js-commons';

import { ErrorMessageValidation } from '../validations/custom-validations';

/** Swallowed after the Allure step so the journey continues; step still records as failed. */
class SoftEmvStepFailed extends Error {
  constructor(detail: string) {
    super(detail);
    this.name = 'SoftEmvStepFailed';
  }
}

const failures: { pageKey: string; error: string }[] = [];

function asText(err: unknown): string {
  return err instanceof Error ? `${err.message}\n${err.stack ?? ''}` : String(err);
}

/** Soft EMV (`errorMessage` PFT) or Allure-only skip note; end the test with `assertAllErrorMessageValidations`. */
export async function softErrorMessageValidation(
  pageKey: string,
  pftFun: (() => Promise<void>) | string
): Promise<void> {
  if (typeof pftFun === 'string') {
    await allureStep(`No EMV: ${pageKey}`, async (ctx: StepContext) => {
      await ctx.parameter('Note', pftFun.slice(0, 4000));
    });
    return;
  }

  try {
    await allureStep(`EMV: ${pageKey}`, async () => {
      const start = ErrorMessageValidation.peekResultsLength();
      let pftError: unknown;
      await pftFun().catch(e => {
        pftError = e;
      });

      const failedMessageChecks = ErrorMessageValidation.getResultsSliceSince(start).filter(r => !r.passed);
      const pftCrashed = pftError !== undefined && pftError !== null;

      if (!pftCrashed && failedMessageChecks.length === 0) {
        return;
      }

      const detail = pftCrashed
        ? asText(pftError)
        : failedMessageChecks.map(r => `${r.pageName || pageKey}: ${r.expected}`).join('\n');
      failures.push({ pageKey, error: detail });
      throw new SoftEmvStepFailed(detail);
    });
  } catch (e) {
    if (e instanceof SoftEmvStepFailed) {
      return;
    }
    throw e;
  }
}

export function assertAllErrorMessageValidations(): void {
  if (!failures.length) {
    return;
  }
  const body = failures.map(f => `${f.pageKey}:\n${f.error}`).join('\n\n---\n\n');
  throw new Error(`Soft EMV failures (${failures.length}):\n\n${body}`);
}

export function clearErrorMessageValidationFailures(): void {
  failures.length = 0;
}
