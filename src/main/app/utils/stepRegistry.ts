import type { StepDefinition } from '../../interfaces/stepFormData.interface';

/**
 * Central registry for managing step definitions and their relationships
 */
export class StepRegistry {
  private steps: Map<string, StepDefinition> = new Map();
  private stepOrder: string[] = [];

  /**
   * Register a step in the registry
   */
  registerStep(step: StepDefinition): void {
    this.steps.set(step.name, step);

    // Maintain order based on stepNumber or insertion order
    if (!this.stepOrder.includes(step.name)) {
      if (step.stepNumber !== undefined) {
        // Insert at correct position based on stepNumber
        const insertIndex = Math.min(step.stepNumber - 1, this.stepOrder.length);
        this.stepOrder.splice(insertIndex, 0, step.name);
      } else {
        this.stepOrder.push(step.name);
      }
    }
  }

  /**
   * Get a step by name
   */
  getStep(stepName: string): StepDefinition | undefined {
    return this.steps.get(stepName);
  }

  /**
   * Get all registered steps
   */
  getAllSteps(): StepDefinition[] {
    return Array.from(this.steps.values());
  }

  /**
   * Get step order
   */
  getStepOrder(): string[] {
    return [...this.stepOrder];
  }

  /**
   * Get next step name (with optional conditional routing)
   */
  getNextStepName(
    currentStepName: string,
    formData?: Record<string, unknown>,
    allData?: Record<string, unknown>
  ): string | null {
    const currentStep = this.getStep(currentStepName);
    if (!currentStep) {
      return null;
    }

    // Use step's getNextStep function if defined
    if (currentStep.getNextStep && formData && allData) {
      const nextStepName = currentStep.getNextStep(formData, allData);
      if (nextStepName) {
        // Validate that the next step exists
        return this.getStep(nextStepName) ? nextStepName : null;
      }
      return null; // End of journey
    }

    // Fall back to step order
    const currentIndex = this.stepOrder.indexOf(currentStepName);
    if (currentIndex === -1 || currentIndex === this.stepOrder.length - 1) {
      return null; // Last step or not found
    }
    return this.stepOrder[currentIndex + 1];
  }

  /**
   * Get previous step name
   */
  getPreviousStepName(currentStepName: string, allData?: Record<string, unknown>): string | null {
    const currentStep = this.getStep(currentStepName);
    if (!currentStep) {
      return null;
    }

    // Use step's getPreviousStep function if defined
    if (currentStep.getPreviousStep && allData) {
      const prevStepName = currentStep.getPreviousStep(allData);
      if (prevStepName) {
        return this.getStep(prevStepName) ? prevStepName : null;
      }
      return null; // First step
    }

    // Fall back to step order
    const currentIndex = this.stepOrder.indexOf(currentStepName);
    if (currentIndex <= 0) {
      return null; // First step or not found
    }
    return this.stepOrder[currentIndex - 1];
  }

  /**
   * Check if a step's prerequisites are met
   */
  arePrerequisitesMet(stepName: string, completedSteps: string[]): boolean {
    const step = this.getStep(stepName);
    if (!step || !step.prerequisites || step.prerequisites.length === 0) {
      return true; // No prerequisites
    }

    return step.prerequisites.every(prereq => completedSteps.includes(prereq));
  }
}

// Export singleton instance
export const stepRegistry = new StepRegistry();
