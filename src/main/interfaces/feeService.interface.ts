export interface FeeLookupParams {
  service: string;
  jurisdiction1: string;
  jurisdiction2: string;
  channel: string;
  event: string;
  keyword: string;
}

export enum FeeType {
  genAppStandardFee,
  genAppMaxFee,
}
