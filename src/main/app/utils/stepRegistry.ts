import type { StepDefinition } from '../../interfaces/stepFormData.interface';

export class StepRegistry {
  private steps: Map<string, StepDefinition> = new Map();
  private stepOrder: string[] = [];

  registerStep(step: StepDefinition): void {
    this.steps.set(step.name, step);

    if (!this.stepOrder.includes(step.name)) {
      this.stepOrder.push(step.name);
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

    const currentUrl = currentStep.url;
    const urlPrefix = currentUrl.split('/').slice(0, 3).join('/');

    const allSteps = Array.from(this.steps.values());
    const stepsInJourney = allSteps
      .filter(step => step.url.startsWith(urlPrefix) && step.stepNumber !== undefined)
      .sort((a, b) => (a.stepNumber || 0) - (b.stepNumber || 0));

    const currentStepInJourney = stepsInJourney.find(step => step.name === currentStepName);
    if (!currentStepInJourney) {
      return null;
    }

    const currentIndex = stepsInJourney.indexOf(currentStepInJourney);
    if (currentIndex === -1 || currentIndex === stepsInJourney.length - 1) {
      return null;
    }

    return stepsInJourney[currentIndex + 1]?.name || null;
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

    const currentUrl = currentStep.url;
    const urlPrefix = currentUrl.split('/').slice(0, 3).join('/');

    const allSteps = Array.from(this.steps.values());
    const stepsInJourney = allSteps
      .filter(step => step.url.startsWith(urlPrefix) && step.stepNumber !== undefined)
      .sort((a, b) => (a.stepNumber || 0) - (b.stepNumber || 0));

    const currentStepInJourney = stepsInJourney.find(step => step.name === currentStepName);
    if (!currentStepInJourney) {
      return null;
    }

    const currentIndex = stepsInJourney.indexOf(currentStepInJourney);
    if (currentIndex <= 0) {
      return null;
    }

    return stepsInJourney[currentIndex - 1]?.name || null;
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
