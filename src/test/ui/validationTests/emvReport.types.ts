/** One expected Gov.uk error-summary line the PFT checks (mirror `performValidation('errorMessage', …)`). */
export type EmvExpectedAssertion = {
  label: string;
  summaryTitle?: string;
  /** Text expected in the error summary / list (full string as used in page data). */
  messageContains?: string;
};

/**
 * Human-readable plan for an EMV step — Allure parameters + Markdown attachments
 * (`softEmvRunner`); can be built next to the PFT that implements the checks.
 */
export type EmvStepReportDetail = {
  intent: string;
  screenTitle?: string;
  actionsOrInputs?: string[];
  expectedAssertions?: EmvExpectedAssertion[];
};
