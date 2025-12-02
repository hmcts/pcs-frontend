import { FieldConfig, JourneyConfig, StepConfig } from './schema';

export class StepValidation {
  static hasInputFields(stepConfig: StepConfig): boolean {
    if (!stepConfig.fields) {
      return false;
    }
    return Object.values(stepConfig.fields).some(f => (f as FieldConfig).type !== 'button');
  }

  /**
   * Check if a step is complete based on required fields
   */
  static isStepComplete(stepId: string, journey: JourneyConfig, allData: Record<string, unknown>): boolean {
    const stepConfig = journey.steps[stepId] as StepConfig;
    const stepData = allData[stepId] as Record<string, unknown>;

    // If no data exists for the step, check if it has required fields
    if (!stepData) {
      if (!stepConfig.fields) {
        return true; // No fields means no validation needed
      }

      const hasRequiredFields = Object.values(stepConfig.fields).some((field: FieldConfig) => {
        // Skip button fields as they are not input fields
        if (field.type === 'button') {
          return false;
        }
        // For function-based required fields, we can't evaluate without data, so assume they might be required
        if (typeof field.validate?.required === 'function') {
          return true; // Assume function-based fields might be required
        }
        // Fields are required by default unless explicitly set to false
        return field.validate?.required !== false;
      });

      return !hasRequiredFields; // If no required fields, step is complete even with no data
    }

    // If step has data, check that all required fields are present
    if (stepConfig.fields) {
      for (const [fieldName, fieldConfig] of Object.entries(stepConfig.fields)) {
        const typedFieldConfig = fieldConfig as FieldConfig;
        // Skip button fields as they are not input fields
        if (typedFieldConfig.type === 'button') {
          continue;
        }
        // Check if field is required (handle both boolean and function cases)
        let isRequired = false;
        if (typeof typedFieldConfig.validate?.required === 'boolean') {
          isRequired = typedFieldConfig.validate.required;
        } else if (typeof typedFieldConfig.validate?.required === 'function') {
          try {
            isRequired = typedFieldConfig.validate.required(stepData, allData);
          } catch {
            // Logging should be done by caller if needed
            isRequired = false;
          }
        } else {
          // Default to required if not explicitly set to false
          isRequired = typedFieldConfig.validate?.required !== false;
        }

        if (isRequired) {
          const fieldValue = stepData[fieldName];

          // For date fields, check if all components are present
          if (typedFieldConfig.type === 'date') {
            const dateValue = fieldValue as { day?: string; month?: string; year?: string };
            if (!dateValue || !dateValue.day || !dateValue.month || !dateValue.year) {
              return false;
            }
          } else if (!fieldValue || (typeof fieldValue === 'string' && fieldValue.trim() === '')) {
            return false;
          }
        }
      }
    }

    return true;
  }

  /**
   * Check if a step is accessible based on journey progress
   */
  static isStepAccessible(stepId: string, journey: JourneyConfig, allData: Record<string, unknown>): boolean {
    // Always allow access to the first step
    const firstStepId = Object.keys(journey.steps)[0];
    if (stepId === firstStepId) {
      return true;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((allData as any).confirmation) {
      return stepId === 'confirmation';
    }

    // Build a map of step dependencies
    const stepDependencies = new Map<string, Set<string>>();
    for (const [id, step] of Object.entries(journey.steps)) {
      const typedStep = step as StepConfig;
      if (!typedStep.next) {
        continue;
      }

      const addDependency = (nextStep: string) => {
        if (!stepDependencies.has(nextStep)) {
          stepDependencies.set(nextStep, new Set());
        }
        stepDependencies.get(nextStep)!.add(id);
      };

      if (typeof typedStep.next === 'string') {
        addDependency(typedStep.next);
      } else {
        addDependency(typedStep.next.goto);
        if (typedStep.next.else) {
          addDependency(typedStep.next.else);
        }
      }
    }

    // Check if all required previous steps are completed
    const visited = new Set<string>();
    const toVisit = new Set<string>([stepId]);

    while (toVisit.size > 0) {
      const currentStep = Array.from(toVisit)[0];
      toVisit.delete(currentStep);
      visited.add(currentStep);

      const dependencies = stepDependencies.get(currentStep) || new Set();
      for (const dependency of dependencies) {
        if (visited.has(dependency)) {
          continue;
        }

        const dependencyStep = journey.steps[dependency] as StepConfig;
        if (!this.hasInputFields(dependencyStep)) {
          continue;
        }

        if (!this.isStepComplete(dependency, journey, allData)) {
          return false;
        }

        toVisit.add(dependency);
      }
    }

    return true;
  }
}
