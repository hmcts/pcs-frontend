import type { Request, Response } from 'express';

import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createGetController, createStepNavigation } from '../../../modules/steps';
import { RESPOND_TO_CLAIM_ROUTE, flowConfig } from '../flow.config';
import { ccdCaseService } from 'services/ccdCaseService';
import { CcdCase, PossessionClaimResponse} from '../../../interfaces/ccdCase.interface';



const stepName = 'postcode-finder';
const stepNavigation = createStepNavigation(flowConfig);

export const step: StepDefinition = {
  url: `${RESPOND_TO_CLAIM_ROUTE}/postcode-finder`,
  name: stepName,
  view: 'respond-to-claim/postcode-finder/postcodeFinder.njk',
  stepDir: __dirname,
  getController: () => {
    return createGetController(
      'respond-to-claim/postcode-finder/postcodeFinder.njk',
      stepName,
      async (req: Request) => {
            const prepopulateAddress = await getExistingAddress(req.session.user?.accessToken || "");
            // const prepopulateAddress = "No address";
        return {
          backUrl: `${RESPOND_TO_CLAIM_ROUTE}/start-now`,
          prepopulateAddress: prepopulateAddress,
          addressKnown: prepopulateAddress !== "No address"
        };
      },
      'respondToClaim'
    );
  },
  postController: {
    post: async (req: Request, res: Response) => {

      console.log("Making API call to save draft data");

      const possessionClaimResponse: PossessionClaimResponse = {
        party: {
          address: {
            AddressLine1: req.body.inputAddressLine1 as string | undefined,
            AddressLine2: req.body.inputAddressLine2 as string | undefined,
            PostTown: req.body.inputPostTown as string | undefined,
            Country: req.body.inputCountry as string | undefined,
            PostCode: req.body.inputPostcode as string | undefined,
          }
        }
      }

      const responseToClaim: CcdCase = {id: "1768917305534047",
        data:  {
          possessionClaimResponse: possessionClaimResponse,
          submitDraftAnswers: "No"
        }
      }
  
      ccdCaseService.submitResponseToClaim(req.session.user?.accessToken, responseToClaim)

      // Get next step URL and redirect
      const redirectPath = stepNavigation.getNextStepUrl(req, stepName, req.body);

      if (!redirectPath) {
        // No next step defined - show not found page
        return res.status(404).render('not-found');
      }

      res.redirect(303, redirectPath);
    },
  },
};

async function getExistingAddress(accessToken : string): Promise<string>{
   // Pull data from API
        const response = await ccdCaseService.getExistingCaseData(accessToken, "1768917305534047");
        const address = response.case_details.case_data.possessionClaimResponse?.party?.address
        
        if (address) {
          const formattedAddress = [
            address.AddressLine1,
            address.AddressLine2,
            address.AddressLine3,
            address.PostTown,
            address.County,
            address.PostCode,
            address.Country,
          ].map(v => (v ?? "").trim())
            .filter(Boolean)
            .join(", ") + "?";
            

            console.log("Mapping addy", formattedAddress)
            return formattedAddress;
        }else {
          return "No address"
        }
}
