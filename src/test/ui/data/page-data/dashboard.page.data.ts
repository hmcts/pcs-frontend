import { createCaseApiData } from '../api-data';

export const dashboard = {
  mainHeader: `${createCaseApiData.createCasePayload.propertyAddress.AddressLine1}, ${createCaseApiData.createCasePayload.propertyAddress.PostTown}, ${createCaseApiData.createCasePayload.propertyAddress.PostCode}`,
  caseNumberParagraph: (): string => `Case number: ${process.env.CASE_FID}`,
};
