import type { Request } from 'express';

import { shouldShowStep } from '../../';
import { flowConfig } from '../flow.config';

import { getFormData } from '@modules/steps';
import { GenAppType, LanguageUsed } from '@services/ccdCase.interface';

export type FieldDetails<T> = {
  stepName: string;
  fieldValue: T;
};

export default class VisibleFormDataView {
  constructor(readonly req: Request) {}

  getApplicationTypeField(): FieldDetails<GenAppType> | undefined {
    return this.getField<GenAppType>('choose-an-application', 'typeOfApplication');
  }

  getHearingInNext14DaysField(): FieldDetails<'yes' | 'no'> | undefined {
    return this.getField('is-the-court-hearing-in-the-next-14-days', 'hearingInNext14Days');
  }

  getHelpWithFeesNeededField(): FieldDetails<'yes' | 'no'> | undefined {
    return this.getField<'yes' | 'no'>('do-you-need-help-paying-the-fee', 'helpWithFeesNeeded');
  }

  getAlreadyAppliedForHwfField(): FieldDetails<'yes' | 'no'> | undefined {
    return this.getField<'yes' | 'no'>('have-you-already-applied-for-help-with-fees', 'alreadyAppliedForHwf');
  }

  getHwfReferenceField(): FieldDetails<string> | undefined {
    const alreadyAppliedForHwfField = this.getAlreadyAppliedForHwfField();

    if (alreadyAppliedForHwfField?.fieldValue === 'yes') {
      return this.getField<string>('have-you-already-applied-for-help-with-fees', 'alreadyAppliedForHwf.hwfReference');
    } else {
      return undefined;
    }
  }

  getOtherPartiesAgreedField(): FieldDetails<'yes' | 'no'> | undefined {
    return this.getField<'yes' | 'no'>('have-the-other-parties-agreed-to-this-application', 'otherPartiesAgreed');
  }

  getAnyReasonsNotToShareField(): FieldDetails<'yes' | 'no'> | undefined {
    return this.getField<'yes' | 'no'>(
      'are-there-any-reasons-that-this-application-should-not-be-shared',
      'reasonsAppShouldNotBeShared'
    );
  }

  getReasonForNotSharingField(): FieldDetails<string> | undefined {
    const anyReasonsNotBeSharedField = this.getAnyReasonsNotToShareField();

    if (anyReasonsNotBeSharedField?.fieldValue === 'yes') {
      return this.getField<string>(
        'are-there-any-reasons-that-this-application-should-not-be-shared',
        'reasonsAppShouldNotBeShared.reasonForNotSharing'
      );
    } else {
      return undefined;
    }
  }

  getWhichLanguageField(): FieldDetails<LanguageUsed> | undefined {
    return this.getField<LanguageUsed>('which-language-did-you-use-to-complete-this-service', 'whichLanguage');
  }

  getWhatOrderWantedField(): FieldDetails<string> | undefined {
    return this.getField<string>('what-order-do-you-want-the-court-to-make-and-why', 'whatOrderWanted');
  }

  private getField<T>(stepName: string, fieldName: string): FieldDetails<T> | undefined {
    if (!shouldShowStep(this.req, stepName, flowConfig)) {
      return undefined;
    }

    return {
      stepName,
      fieldValue: getFormData(this.req, stepName)[fieldName] as T,
    };
  }
}
