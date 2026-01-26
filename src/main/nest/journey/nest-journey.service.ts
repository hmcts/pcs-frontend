import { Injectable } from '@nestjs/common';

import type { Step1Dto } from './dto/step1.dto';
import type { Step2Dto } from './dto/step2.dto';
import type { Step3Dto } from './dto/step3.dto';

export interface JourneyData {
  step1?: Step1Dto;
  step2?: Step2Dto;
  step3?: Step3Dto;
  completedSteps: string[];
}

export const JOURNEY_STEPS = ['step1', 'step2', 'step3', 'confirmation'] as const;
export type JourneyStep = (typeof JOURNEY_STEPS)[number];

export const JOURNEY_BASE_PATH = '/nest-journey';

@Injectable()
export class NestJourneyService {
  getStepUrl(step: JourneyStep): string {
    return `${JOURNEY_BASE_PATH}/${step}`;
  }

  getNextStep(currentStep: JourneyStep): JourneyStep | null {
    const currentIndex = JOURNEY_STEPS.indexOf(currentStep);
    if (currentIndex >= 0 && currentIndex < JOURNEY_STEPS.length - 1) {
      return JOURNEY_STEPS[currentIndex + 1];
    }
    return null;
  }

  getPreviousStep(currentStep: JourneyStep): JourneyStep | null {
    const currentIndex = JOURNEY_STEPS.indexOf(currentStep);
    if (currentIndex > 0) {
      return JOURNEY_STEPS[currentIndex - 1];
    }
    return null;
  }

  canAccessStep(step: JourneyStep, journeyData: JourneyData): boolean {
    if (step === 'step1') {
      return true;
    }

    const stepIndex = JOURNEY_STEPS.indexOf(step);
    if (stepIndex <= 0) {
      return true;
    }

    const previousStep = JOURNEY_STEPS[stepIndex - 1];
    return journeyData.completedSteps.includes(previousStep);
  }

  getFirstIncompleteStep(journeyData: JourneyData): JourneyStep {
    for (const step of JOURNEY_STEPS) {
      if (step === 'confirmation') {
        continue;
      }
      if (!journeyData.completedSteps.includes(step)) {
        return step;
      }
    }
    return 'confirmation';
  }

  markStepComplete(journeyData: JourneyData, step: JourneyStep): void {
    if (!journeyData.completedSteps.includes(step)) {
      journeyData.completedSteps.push(step);
    }
  }

  getBackUrl(currentStep: JourneyStep): string | null {
    const previousStep = this.getPreviousStep(currentStep);
    if (previousStep) {
      return this.getStepUrl(previousStep);
    }
    return '/dashboard';
  }
}
