import { createCaseApiData } from '../api-data';
import { createCaseApiWalesData } from '../api-data/createCaseWales.api.data';

export const dashboard = {
  get mainHeader() {
    return process.env.WALES_POSTCODE === 'YES'
      ? `${createCaseApiWalesData.createCasePayload.propertyAddress.AddressLine1}, ${createCaseApiWalesData.createCasePayload.propertyAddress.PostTown}, ${createCaseApiWalesData.createCasePayload.propertyAddress.PostCode}`
      : `${createCaseApiData.createCasePayload.propertyAddress.AddressLine1}, ${createCaseApiData.createCasePayload.propertyAddress.PostTown}, ${createCaseApiData.createCasePayload.propertyAddress.PostCode}`;
  },
  viewTheResponseSubHeader: `My Welsh word`,
};
