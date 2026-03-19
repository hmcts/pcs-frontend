import { Page } from '@playwright/test';

export type validationData = string | number | boolean | string[] | object;
export type validationRecord = Record<string, validationData>;
export type validationTuple =
  | [string, validationData | validationRecord]
  | [string, validationData | validationRecord, validationData | validationRecord];

export interface IValidation {
  validate(
    page: Page,
    validation: string,
    fieldName?: validationData | validationRecord,
    data?: validationData | validationRecord
  ): Promise<void>;
}
