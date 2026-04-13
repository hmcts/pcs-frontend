import type { Request } from 'express';

import { GenAppType } from '../../../interfaces/ccdCase.interface';
import { shouldShowStep } from '../../showConditionService';
import { flowConfig } from '../flow.config';

import { getFormData } from '@modules/steps';

export type FieldDetails<T> = {
  stepName: string;
  fieldValue: T;
};

export default class VisibleFormDataView {
  constructor(readonly req: Request) {}

  getApplicationTypeField(): FieldDetails<GenAppType> | undefined {
    const stepName = 'choose-an-application';
    if (!shouldShowStep(this.req, stepName, flowConfig)) {
      return undefined;
    }

    return {
      stepName,
      fieldValue: getFormData(this.req, stepName).typeOfApplication as GenAppType,
    };
  }

  getHearingInNext14DaysField(): FieldDetails<'yes' | 'no'> | undefined {
    const stepName = 'is-the-court-hearing-in-the-next-14-days';
    if (!shouldShowStep(this.req, stepName, flowConfig)) {
      return undefined;
    }

    return {
      stepName,
      fieldValue: getFormData(this.req, stepName).hearingInNext14Days as 'yes' | 'no',
    };
  }

  getHelpWithFeesNeededField(): FieldDetails<'yes' | 'no'> | undefined {
    const stepName = 'do-you-need-help-paying-the-fee';
    if (!shouldShowStep(this.req, stepName, flowConfig)) {
      return undefined;
    }

    return {
      stepName,
      fieldValue: getFormData(this.req, stepName).helpWithFeesNeeded as 'yes' | 'no',
    };
  }

  getAlreadyAppliedForHwfField(): FieldDetails<'yes' | 'no'> | undefined {
    const stepName = 'have-you-already-applied-for-help-with-fees';
    if (!shouldShowStep(this.req, stepName, flowConfig)) {
      return undefined;
    }

    return {
      stepName,
      fieldValue: getFormData(this.req, stepName).alreadyAppliedForHwf as 'yes' | 'no',
    };
  }

  getHwfReferenceField(): FieldDetails<string> | undefined {
    const stepName = 'have-you-already-applied-for-help-with-fees';
    if (!shouldShowStep(this.req, stepName, flowConfig)) {
      return undefined;
    }

    const alreadyAppliedForHwf = getFormData(this.req, stepName).alreadyAppliedForHwf as 'yes' | 'no';

    if (alreadyAppliedForHwf === 'yes') {
      return {
        stepName,
        fieldValue: getFormData(this.req, stepName)['alreadyAppliedForHwf.hwfReference'] as string,
      };
    } else {
      return undefined;
    }
  }

  getOtherPartiesAgreedField(): FieldDetails<'yes' | 'no'> | undefined {
    const stepName = 'have-the-other-parties-agreed-to-this-application';
    if (!shouldShowStep(this.req, stepName, flowConfig)) {
      return undefined;
    }

    return {
      stepName,
      fieldValue: getFormData(this.req, stepName).otherPartiesAgreed as 'yes' | 'no',
    };
  }

  getAnyReasonsNotToShareField(): FieldDetails<'yes' | 'no'> | undefined {
    const stepName = 'are-there-any-reasons-that-this-application-should-not-be-shared';
    if (!shouldShowStep(this.req, stepName, flowConfig)) {
      return undefined;
    }

    return {
      stepName,
      fieldValue: getFormData(this.req, stepName).reasonsAppShouldNotBeShared as 'yes' | 'no',
    };
  }

  getReasonForNotSharingField(): FieldDetails<string> | undefined {
    const stepName = 'are-there-any-reasons-that-this-application-should-not-be-shared';
    if (!shouldShowStep(this.req, stepName, flowConfig)) {
      return undefined;
    }

    const reasonsAppShouldNotBeShared = getFormData(this.req, stepName).reasonsAppShouldNotBeShared as 'yes' | 'no';

    if (reasonsAppShouldNotBeShared === 'yes') {
      return {
        stepName,
        fieldValue: getFormData(this.req, stepName)['reasonsAppShouldNotBeShared.reasonForNotSharing'] as string,
      };
    } else {
      return undefined;
    }
  }
}
