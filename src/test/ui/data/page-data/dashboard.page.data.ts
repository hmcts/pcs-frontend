import { createCaseApiData } from '../api-data';
import { createCaseApiWalesData } from '../api-data/createCaseWales.api.data';

export const dashboard = {
  mainHeader: (): string => {
    const address = process.env.ADDRESS;
    if (address === 'Wales') {
      return `${createCaseApiWalesData.createCasePayload.propertyAddress.AddressLine1},
              ${createCaseApiWalesData.createCasePayload.propertyAddress.PostTown},
              ${createCaseApiWalesData.createCasePayload.propertyAddress.PostCode}`;
    }
    return `${createCaseApiData.createCasePayload.propertyAddress.AddressLine1},
            ${createCaseApiData.createCasePayload.propertyAddress.PostTown},
            ${createCaseApiData.createCasePayload.propertyAddress.PostCode}`;
  },
  caseNumberParagraph: (): string => `Case number: ${process.env.CASE_FID}`,
};
