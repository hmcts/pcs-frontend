import { RequestHandler } from 'express';

import { GetController, type SupportedLang } from '@modules/steps';

export interface ErrorField {
  field: string;
  text: string;
}

export interface StepFormData {
  error?: ErrorField | string | undefined;
  answer?: string;
  choices?: string[] | string;
  [key: string]: unknown;
}

export interface StepDefinition {
  url: string;
  name: string;
  view: string;
  stepDir: string;
  getController: GetController | ((lang?: SupportedLang) => GetController);
  postController?: { post: RequestHandler };
  middleware?: RequestHandler[];
  showCancelButton?: boolean;
  // Path of CCD field keys identifying where this step's uploaded documents
  // live in the case data — e.g. ['possessionClaimResponse','defendantResponses','defendantDocuments']
  // resolves to caseData.possessionClaimResponse.defendantResponses.defendantDocuments.
  // Required on upload steps; absent on every other step. The non-empty tuple
  // type prevents silently declaring an empty path. The upload handler refuses
  // requests targeting a step that does not declare this path.
  uploadDocsPath?: readonly [string, ...string[]];
}
