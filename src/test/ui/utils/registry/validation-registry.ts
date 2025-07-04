import { IValidation } from '../interfaces/validation.interface';
import { AttributeValidation } from '../validations/attribute.validation';
import { CheckedValidation } from '../validations/checked.validation';
import { ContainsTextValidation } from '../validations/contains-text.validation';
import { CountValidation } from '../validations/count.validation';
import { CssValidation } from '../validations/css.validation';
import { EnabledValidation } from '../validations/enabled.validation';
import { TextValidation } from '../validations/text.validation';
import { ValueValidation } from '../validations/value.validation';
import { VisibilityValidation } from '../validations/visibility.validation';

export class ValidationRegistry {
  private static validations: Map<string, IValidation> = new Map([
    ['text', new TextValidation()],
    ['value', new ValueValidation()],
    ['visibility', new VisibilityValidation()],
    ['enabled', new EnabledValidation()],
    ['checked', new CheckedValidation()],
    ['count', new CountValidation()],
    ['attribute', new AttributeValidation()],
    ['containsText', new ContainsTextValidation()],
    ['css', new CssValidation()],
  ]);

  static getValidation(validationType: string): IValidation {
    const validation = this.validations.get(validationType);
    if (!validation) {
      throw new Error(
        `Validation '${validationType}' is not registered. Available validations: ${Array.from(this.validations.keys()).join(', ')}`
      );
    }
    return validation;
  }

  static registerValidation(validationType: string, validation: IValidation): void {
    this.validations.set(validationType, validation);
  }

  static getAvailableValidations(): string[] {
    return Array.from(this.validations.keys());
  }
}
