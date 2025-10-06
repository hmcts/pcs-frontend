import { IValidation } from '../interfaces/validation.interface';
import { MainHeaderValidation } from '../validations/element-validations/pageHeader.validation';

export class ValidationRegistry {
  private static validations: Map<string, IValidation> = new Map([['mainHeader', new MainHeaderValidation()]]);

  static getValidation(validationType: string): IValidation {
    const validation = this.validations.get(validationType);
    if (!validation) {
      throw new Error(
        `Validation '${validationType}' is not registered. Available validations: ${Array.from(this.validations.keys()).join(', ')}`
      );
    }
    return validation;
  }

  static getAvailableValidations(): string[] {
    return Array.from(this.validations.keys());
  }
}
