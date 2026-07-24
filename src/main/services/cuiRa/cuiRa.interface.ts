// Types for the CUI Reasonable Adjustments / Your Support micro-frontend (cui-ra).
// Shapes follow the service's published contract (Confluence). Only the invocation
// (POST /api/payload) request/response are exercised by this first slice; the flag
// types are the shared structure reused by the later return/callback leg.

export type CuiRaLanguage = 'en' | 'cy';

export interface CuiRaFlagPathItem {
  id?: string;
  name: string;
}

// See <flagDetail> in the contract. Most fields are optional and only populated
// once flags have been captured; the required ones are always present.
export interface CuiRaFlagDetail {
  name: string;
  name_cy: string;
  subTypeValue?: string;
  subTypeValue_cy?: string;
  subTypeKey?: string;
  otherDescription?: string;
  otherDescription_cy?: string;
  flagComment?: string;
  flagComment_cy?: string;
  flagUpdateComment?: string;
  dateTimeModified: string;
  dateTimeCreated: string;
  path: CuiRaFlagPathItem[];
  hearingRelevant: 'Yes' | 'No';
  flagCode: string;
  status: string;
  availableExternally: 'Yes' | 'No';
}

// See <detail> / flagDetailInCollection. `id` is only present for flags supplied
// by the invoking service.
export interface CuiRaFlagDetailInCollection {
  id?: string;
  value: CuiRaFlagDetail;
}

// See <flags>. `partyName` and `roleOnCase` are required; `details` is empty on a
// first-time capture (no existing adjustments to pass in).
export interface CuiRaFlags {
  partyName: string;
  roleOnCase: string;
  details: CuiRaFlagDetailInCollection[];
}

// Body of POST /api/payload — invokes the microsite for a party.
// Field names follow cui-ra's InboundPayloadSchema exactly (callbackUrl/logoutUrl are
// camelCase, NOT the all-caps callbackURL/logoutURL shown in the Postman collection),
// and the schema is additionalProperties:false so no extra keys may be sent.
export interface CuiRaInvocationRequest {
  callbackUrl: string;
  logoutUrl: string;
  language: CuiRaLanguage;
  existingFlags: CuiRaFlags;
  hmctsServiceId: string;
  masterFlagCode: string;
  correlationId: string;
}

// Response of POST /api/payload — the microsite URL to redirect the browser to.
export interface CuiRaInvocationResponse {
  url: string;
}

// The action the citizen completed in the microsite (returned by GET /api/payload/:id).
// 'submit' = save the data; 'cancel' = ignore, make no changes.
export type CuiRaAction = 'submit' | 'cancel';

// Response of GET /api/payload/:id — the result of the citizen's microsite session.
// `flagsAsSupplied` / `replacementFlags` are only present depending on what changed in the
// microsite (see the cui-ra contract); `action` and `correlationId` are always present.
export interface CuiRaGetPayloadResponse {
  flagsAsSupplied?: CuiRaFlags;
  replacementFlags?: CuiRaFlags;
  action: CuiRaAction;
  correlationId: string;
}
