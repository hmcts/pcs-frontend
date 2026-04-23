import { type StepContext, step as allureStep } from 'allure-js-commons';

import { ErrorMessageValidation } from '../utils/validations/custom-validations';

class SoftEmvStepFailed extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SoftEmvStepFailed';
  }
}

const formatPageKeyTitle = (pageKey: string) =>
  pageKey
    .replace(/([A-Z])/g, ' $1')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim();

const formatErrorForReporting = (error: unknown) =>
  error instanceof Error ? `${error.message}\n${error.stack ?? ''}` : String(error);

export function createSoftEmvRunner() {
  const emvFailures: { pageKey: string; error: string }[] = [];

  async function run(pageKey: string, errorValidationPft: () => Promise<void>): Promise<void> {
    try {
      await allureStep(`EMV — ${formatPageKeyTitle(pageKey)}`, async () => {
        const validationResultsIndexBeforePft = ErrorMessageValidation.peekResultsLength();
        let caughtError: unknown;
        try {
          await errorValidationPft();
        } catch (error) {
          caughtError = error;
        }
        const validationSnapshotsAfterPft = ErrorMessageValidation.getResultsSliceSince(
          validationResultsIndexBeforePft
        );

        const failedSnapshots = validationSnapshotsAfterPft.filter(snapshot => !snapshot.passed);
        if (!caughtError && !failedSnapshots.length) {
          return;
        }

        const failureSummary = caughtError
          ? formatErrorForReporting(caughtError)
          : failedSnapshots.map(s => `${s.pageName || pageKey}: ${s.expected}`).join('\n');
        emvFailures.push({ pageKey, error: failureSummary });
        throw new SoftEmvStepFailed(failureSummary);
      });
    } catch (caughtError) {
      if (caughtError instanceof SoftEmvStepFailed) {
        return;
      }
      throw caughtError;
    }
  }

  async function markNoEmv(
    pageKey: string,
    note = 'Read-only / informational screen — no field error validation.'
  ): Promise<void> {
    await allureStep(`No EMV — ${formatPageKeyTitle(pageKey)} (read-only)`, async (stepContext: StepContext) => {
      await stepContext.parameter('Note', note.slice(0, 2000));
    });
  }

  function assertAll(): void {
    if (!emvFailures.length) {
      return;
    }
    const failureSummaryBody = emvFailures.map(failure => `${failure.pageKey}:\n${failure.error}`).join('\n\n---\n\n');
    throw new Error(`${emvFailures.length} EMV step(s) failed — see Allure EMV steps.\n\n${failureSummaryBody}`);
  }

  return { run, markNoEmv, assertAll };
}
