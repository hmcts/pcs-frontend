import { ErrorMessageValidation } from '../validations/custom-validations';

/** Swallowed after the Allure step so the journey continues; step still records as failed. */
class SoftEmvStepFailed extends Error {
  constructor(detail: string) {
    super(detail);
    this.name = 'SoftErrorMessageValidation(EMV)StepFailed';
  }
}

const failures: { pageKey: string; error: string }[] = [];
type StepRunner = <T>(name: string, body: () => Promise<T> | T) => Promise<T>;

let cachedStepRunner: StepRunner | null = null;

function getStepRunner(): StepRunner {
  if (cachedStepRunner) {
    return cachedStepRunner;
  }
  try {
    // Keep this optional for runners where allure-js-commons is not installed.

    const allureModule = require('allure-js-commons') as { step?: StepRunner };
    if (typeof allureModule.step === 'function') {
      cachedStepRunner = allureModule.step;
      return cachedStepRunner;
    }
  } catch {
    // no-op: fallback to plain execution
  }
  cachedStepRunner = async <T>(_name: string, body: () => Promise<T> | T) => Promise.resolve(body());
  return cachedStepRunner;
}

function asText(err: unknown): string {
  return err instanceof Error ? `${err.message}\n${err.stack ?? ''}` : String(err);
}

/** Soft ErrorMessageValidation(EMV) (`errorMessage` PFT) or Allure-only skip note; end the test with `assertAllErrorMessageValidations`. */
export async function softErrorMessageValidation(
  pageKey: string,
  pftFun: (() => Promise<void>) | string
): Promise<void> {
  const stepRunner = getStepRunner();
  if (typeof pftFun === 'string') {
    // Do not use StepContext.parameter() here: with allure-playwright it can race step teardown
    // and log "could not update test step: no step with uuid ... is found". Keep the reason in the title.
    const note = pftFun.trim().slice(0, 400);
    const title = note
      ? `No ErrorMessageValidation(EMV): ${pageKey} — ${note}`
      : `No ErrorMessageValidation(EMV): ${pageKey}`;
    await stepRunner(title, async () => {
      /* note is in step title */
    });
    return;
  }

  try {
    await stepRunner(`ErrorMessageValidation(EMV) for - ${pageKey}`, async () => {
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
  throw new Error(`Soft ErrorMessageValidation(EMV) failures (${failures.length}):\n\n${body}`);
}

export function clearErrorMessageValidationFailures(): void {
  failures.length = 0;
}
