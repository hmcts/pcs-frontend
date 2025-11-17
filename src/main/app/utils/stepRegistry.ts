import type { StepDefinition } from '../../interfaces/stepFormData.interface';

export class StepRegistry {
  private steps: Map<string, StepDefinition> = new Map();
  private stepOrder: string[] = [];

  registerStep(step: StepDefinition): void {
    this.steps.set(step.name, step);

    if (!this.stepOrder.includes(step.name)) {
      if (step.stepNumber !== undefined) {
        const insertIndex = Math.min(step.stepNumber - 1, this.stepOrder.length);
        this.stepOrder.splice(insertIndex, 0, step.name);
      } else {
        this.stepOrder.push(step.name);
      }
    }
  }

  getStep(stepName: string): StepDefinition | undefined {
    return this.steps.get(stepName);
  }

  getStepByUrl(url: string): StepDefinition | undefined {
    for (const step of this.steps.values()) {
      if (step.url === url) {
        return step;
      }
    }
    return undefined;
  }

  getAllSteps(): StepDefinition[] {
    return Array.from(this.steps.values());
  }

  getStepOrder(): string[] {
    return [...this.stepOrder];
  }

  getNextStepName(
    currentStepName: string,
    formData?: Record<string, unknown>,
    allData?: Record<string, unknown>
  ): string | null {
    const currentStep = this.getStep(currentStepName);
    if (!currentStep) {
      return null;
    }

    if (currentStep.getNextStep && formData && allData) {
      const nextStepName = currentStep.getNextStep(formData, allData);
      if (nextStepName) {
        return this.getStep(nextStepName) ? nextStepName : null;
      }
      return null;
    }

    const currentIndex = this.stepOrder.indexOf(currentStepName);
    if (currentIndex === -1 || currentIndex === this.stepOrder.length - 1) {
      return null;
    }
    return this.stepOrder[currentIndex + 1];
  }

  getPreviousStepName(currentStepName: string, allData?: Record<string, unknown>): string | null {
    const currentStep = this.getStep(currentStepName);
    if (!currentStep) {
      return null;
    }

    if (currentStep.getPreviousStep && allData) {
      const prevStepName = currentStep.getPreviousStep(allData);
      if (prevStepName) {
        return this.getStep(prevStepName) ? prevStepName : null;
      }
      return null;
    }

    const currentIndex = this.stepOrder.indexOf(currentStepName);
    if (currentIndex <= 0) {
      return null;
    }
    return this.stepOrder[currentIndex - 1];
  }

  arePrerequisitesMet(stepName: string, completedSteps: string[]): boolean {
    const step = this.getStep(stepName);
    if (!step || !step.prerequisites || step.prerequisites.length === 0) {
      return true;
    }

    return step.prerequisites.every(prereq => completedSteps.includes(prereq));
  }

  clear(): void {
    this.steps.clear();
    this.stepOrder = [];
  }
}

export const stepRegistry = new StepRegistry();
