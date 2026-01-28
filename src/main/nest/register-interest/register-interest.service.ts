import { Injectable } from '@nestjs/common';

@Injectable()
export class RegisterInterestService {
  getNextStep(currentStep: string, formData?: Record<string, unknown>): string {
    switch (currentStep) {
      case 'step1':
        return '/register-interest/step2';
      case 'step2':
        return '/register-interest/step3';
      case 'step3':
        return '/register-interest/confirmation';
      default:
        return '/register-interest/step1';
    }
  }

  getPreviousStep(currentStep: string): string | null {
    switch (currentStep) {
      case 'step2':
        return '/register-interest/step1';
      case 'step3':
        return '/register-interest/step2';
      default:
        return null;
    }
  }
}