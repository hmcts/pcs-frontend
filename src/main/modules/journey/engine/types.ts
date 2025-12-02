import { Request } from 'express';

import { StepConfig } from './schema';

// Extend Express Request interface
export interface RequestWithStep extends Request {
  step?: StepConfig;
}

export interface SummaryRow {
  key: { text: string };
  value: { text: string; html?: string };
  actions?: {
    items: {
      href: string;
      text: string;
      visuallyHiddenText: string;
    }[];
  };
}

// Simplified journey context
export interface JourneyContext {
  caseId: string;
  step: StepConfig;
  data: Record<string, unknown>;
  allData: Record<string, unknown>;
  errors?: Record<string, { day?: string; month?: string; year?: string; message: string; anchor?: string }>;
  errorSummary?: { titleText: string; errorList: { text: string; href: string }[] } | null;
  previousStepUrl?: string | null;
  summaryRows?: SummaryRow[];
  // When using summary cards grouped by step
  summaryCards?: { card: { title: { text: string } }; rows: SummaryRow[] }[];
}
