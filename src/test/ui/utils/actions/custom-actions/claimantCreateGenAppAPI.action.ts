import { Page } from '@playwright/test';
// eslint-disable-next-line import/no-named-as-default
import Axios from 'axios';

import { createCaseEventTokenApiData } from '../../../data/api-data';
import { claimantCreateGenAppApiData } from '../../../data/api-data/claimantCreateGenApp.api.data';
import { getCaseApiData } from '../../../data/api-data/getCase.api.data';
import { paymentApiData } from '../../../data/api-data/payment.api.data';
import { IAction, actionData, actionRecord } from '../../interfaces';

export class ClaimantCreateGenAppAPIAction implements IAction {
  async execute(_page: Page, action: string, fieldName: actionData | actionRecord): Promise<void> {
    if (action !== 'claimantCreateGenAppApi') {
      throw new Error(`No action found for '${action}'`);
    }

    const requestData = fieldName as actionData;
    const providedPayload =
      typeof requestData === 'object' && requestData !== null && 'data' in requestData ? requestData.data : requestData;
    if (typeof providedPayload !== 'object' || providedPayload === null || Array.isArray(providedPayload)) {
      throw new Error('Claimant GenApp payload was not provided.');
    }

    const caseApi = Axios.create(createCaseEventTokenApiData.createCaseApiInstance());
    const caseResponse = await caseApi.get(getCaseApiData.getCaseApiEndPoint());
    const applicantPartyId = caseResponse.data?.data?.allClaimants?.[0]?.id;
    if (!applicantPartyId) {
      throw new Error(`No claimant party ID found for case ${process.env.CASE_NUMBER}`);
    }

    const config = claimantCreateGenAppApiData();
    const claimantApi = caseApi;

    const eventToken = (await claimantApi.get(config.claimantCreateGenAppEventTokenApiEndPoint())).data?.token;
    if (!eventToken) {
      throw new Error('Claimant GenApp event-token response did not contain a token.');
    }

    try {
      await claimantApi.post(config.claimantCreateGenAppApiEndPoint(), {
        data: { ...(providedPayload as Record<string, unknown>), xui_genapp_ApplicantPartyId: applicantPartyId },
        event: { id: config.claimantCreateGenAppEventName, summary: '', description: '' },
        event_token: eventToken,
        ignore_warning: false,
      });
      // The application stays unissued until its own fee service request is paid; that request is created asynchronously.
      // Submitting the GenApp event creates the application, but it stays unissued until its own fee service request is paid.
      // That fee service request isn't created in the same call. The backend creates it asynchronously after the event is submitted.
      // If the test moved on right away, the application would still be unissued and later steps would fail.

      const paymentApi = Axios.create(paymentApiData.paymentApiInstance());
      type FeeRequest = {
        serviceRequestReference: string;
        amount?: number;
        paymentStatus: string;
        paymentCallbackHandlerType: string;
      };
      let unpaid: FeeRequest | undefined;
      let feeRequests: FeeRequest[] = [];
      for (let attempt = 1; attempt <= 10 && !unpaid; attempt++) {
        feeRequests = (await paymentApi.get(paymentApiData.getFeePaymentInfoApiEndPoint())).data as FeeRequest[];
        unpaid = feeRequests.find(request => request.paymentStatus !== 'PAID');
        if (!unpaid) {
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }
      if (!unpaid) {
        throw new Error(
          `No unpaid application-fee service request appeared. Requests: ${JSON.stringify(
            feeRequests.map(({ serviceRequestReference, paymentStatus, paymentCallbackHandlerType }) => ({
              serviceRequestReference,
              paymentStatus,
              paymentCallbackHandlerType,
            }))
          )}`
        );
      }
      await paymentApi.put(
        paymentApiData.updatePaymentApiEndPoint,
        paymentApiData.paymentUpdatePayload(unpaid.serviceRequestReference, Number(unpaid.amount))
      );
      console.log(`\n CLAIMANT GENAPP SUBMITTED AND FEE PAID: case ${process.env.CASE_NUMBER}`);
    } catch (error: unknown) {
      if (Axios.isAxiosError(error)) {
        throw new Error(
          `Claimant GenApp POST failed with status ${error.response?.status}: ${JSON.stringify(error.response?.data)}`
        );
      }
      throw error;
    }
  }
}
