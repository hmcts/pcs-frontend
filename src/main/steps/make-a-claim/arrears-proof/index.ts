import type { Request } from 'express';

import { PROOF_TYPES } from '../claimMapping';
import { designOf, offeredProofTypes } from '../conditions';
import { radioQuestion } from '../fieldBuilders';
import { createMakeAClaimStep } from '../formStep';

import type { BuiltFormContent } from '@modules/steps/formBuilder/formFieldConfig.interface';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import type { ProofType } from '@services/citizenPossessionClaim.interface';

export const step: StepDefinition = createMakeAClaimStep({
  stepName: 'arrears-proof',
  stepDir: __dirname,
  fields: [
    radioQuestion('proofType', PROOF_TYPES, {
      isPageHeading: false,
      legendClasses: 'govuk-fieldset__legend--m',
      validator: (value, _formData, _allData, req) =>
        !req || offeredProofTypes(req).includes(value as ProofType) ? true : 'errors.proofType',
    }),
  ],
  extendGetContent: (req: Request, formContent: BuiltFormContent) => {
    const offered = offeredProofTypes(req);
    for (const field of formContent.fields ?? []) {
      const items = field.component?.items as { value?: string }[] | undefined;
      if (field.name === 'proofType' && items) {
        field.component!.items = items.filter(item => offered.includes(item.value as ProofType));
      }
    }
    return { design: designOf(req) };
  },
});
