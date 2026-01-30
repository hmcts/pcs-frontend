import type { StepDefinition } from '../../interfaces/stepFormData.interface';

import { step as confirmationOfNoticeDateNotProvided } from './confirmation-of-notice-date-when-not-provided';
import { step as confirmationOfNoticeDateProvided } from './confirmation-of-notice-date-when-provided';
import { step as confirmationOfNoticeGiven } from './confirmation-of-notice-given';
import { step as defendantDateOfBirth } from './defendant-date-of-birth';
import { step as defendantNameCapture } from './defendant-name-capture';
import { step as defendantNameConfirmation } from './defendant-name-confirmation';
import { step as freeLegalAdvice } from './free-legal-advice';
import { step as nonRentArrearsDispute } from './non-rent-arrears-dispute';
import { step as postcodeFinder } from './postcode-finder';
import { step as rentArrearsDispute } from './rent-arrears-dispute';
import { step as startNow } from './start-now';

export const stepRegistry: Record<string, StepDefinition> = {
  'start-now': startNow,
  'postcode-finder': postcodeFinder,
  'free-legal-advice': freeLegalAdvice,
  'defendant-name-confirmation': defendantNameConfirmation,
  'defendant-name-capture': defendantNameCapture,
  'defendant-date-of-birth': defendantDateOfBirth,
  'confirmation-of-notice-given': confirmationOfNoticeGiven,
  'confirmation-of-notice-date-when-provided': confirmationOfNoticeDateProvided,
  'confirmation-of-notice-date-when-not-provided': confirmationOfNoticeDateNotProvided,
  'rent-arrears-dispute': rentArrearsDispute,
  'non-rent-arrears-dispute': nonRentArrearsDispute,
};
