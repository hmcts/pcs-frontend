import { type StepContext, step as allureStep } from 'allure-js-commons';

import { ErrorMessageValidation } from '../validations/custom-validations';

/** Marks the Allure step failed; caught outside so the test keeps running. */
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
      let thrown: unknown;
      try {
        //PFT error validation function gets triggered here
        await pftFun();
      } catch (e) {
        thrown = e;
      }

      const failed = ErrorMessageValidation.getResultsSliceSince(start).filter(r => !r.passed);
      const fromCatch = thrown !== undefined && thrown !== null;
      if (!fromCatch && failed.length === 0) {
        return;
      }

      const error = fromCatch ? asText(thrown) : failed.map(r => `${r.pageName || pageKey}: ${r.expected}`).join('\n');

      failures.push({ pageKey, error });
      throw new SoftEmvStepFailed(error);
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
  const blocks = failures.map(f => `${f.pageKey}:\n${f.error}`).join('\n\n---\n\n');
  throw new Error(`Soft EMV failures (${failures.length}):\n\n${blocks}`);
}

export function clearErrorMessageValidationFailures(): void {
  failures.length = 0;
}
