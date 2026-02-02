import { Injectable } from '@nestjs/common';

@Injectable()
export class RespondToClaimService {
  private readonly stepOrder = ['start-now', 'postcode-finder', 'free-legal-advice'];

  getNextStep(currentStep: string): string | null {
    const currentIndex = this.stepOrder.indexOf(currentStep);

    if (currentIndex === -1 || currentIndex === this.stepOrder.length - 1) {
      return null;
    }

    const nextStep = this.stepOrder[currentIndex + 1];
    return `/respond-to-claim/${nextStep}`;
  }

  getPreviousStep(currentStep: string): string | null {
    const currentIndex = this.stepOrder.indexOf(currentStep);

    if (currentIndex <= 0) {
      return '/dashboard';
    }

    const previousStep = this.stepOrder[currentIndex - 1];
    return `/respond-to-claim/${previousStep}`;
  }

  getStepOrder(): string[] {
    return [...this.stepOrder];
  }

  isValidStep(stepName: string): boolean {
    return this.stepOrder.includes(stepName);
  }
}
