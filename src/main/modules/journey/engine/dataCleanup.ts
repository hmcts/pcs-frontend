import { StepConfig } from './schema';

export class DataCleanup {
  /**
   * Clean up data for conditionally required fields that are no longer required.
   * This method removes data for fields where the required function evaluates to false.
   * Static optional fields (required: false) are not cleaned up to preserve user data.
   */
  static async cleanupConditionalData(
    step: StepConfig,
    stepData: Record<string, unknown>,
    allData: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const cleanedData = { ...stepData };

    if (!step.fields) {
      return cleanedData;
    }

    for (const [fieldName, fieldConfig] of Object.entries(step.fields)) {
      // Only clean up if this is a conditionally required field (function) that returns false
      // Static optional fields (required: false) should keep their data
      if (typeof fieldConfig.validate?.required === 'function') {
        try {
          const isRequired = fieldConfig.validate.required(cleanedData, allData);

          // Only clean up if the conditional function says the field is not required
          if (!isRequired) {
            delete cleanedData[fieldName];
          }
        } catch {
          // Logging should be done by caller if needed
          // On error, don't clean up the data
        }
      }
      // For static required: false, we don't clean up - let the user's data persist
    }

    return cleanedData;
  }
}
