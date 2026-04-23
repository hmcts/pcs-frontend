/** One expected Gov.uk error-summary line the PFT checks (mirror `performValidation('errorMessage', …)`). */
export type EmvExpectedAssertion = {
  label: string;
  summaryTitle?: string;
  /** Text expected in the error summary / list (full string as used in page data). */
  messageContains?: string;
};

/** Internal shape for auto-built EMV Allure data (`softEmvRunner` only — not used by PFT authors). */
export type EmvStepReportDetail = {
  intent: string;
  screenTitle?: string;
  /** Lines from `performAction` only (while EMV capture is on). */
  actionsOrInputs?: string[];
  /** Lines from `performValidation` only (while EMV capture is on). */
  validationSteps?: string[];
  expectedAssertions?: EmvExpectedAssertion[];
};
