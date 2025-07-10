import { IValidation } from '../interfaces/validation.interface';
import { DashboardNotificationValidation } from '../validations/custom-validations/dashboardNotification.validation';
import { DashboardTasksValidation } from '../validations/custom-validations/dashboardTasks.validation';
import { AttributeValidation } from '../validations/element-validations/attribute.validation';
import { CheckedValidation } from '../validations/element-validations/checked.validation';
import { ContainsTextValidation } from '../validations/element-validations/contains-text.validation';
import { CountValidation } from '../validations/element-validations/count.validation';
import { CssValidation } from '../validations/element-validations/css.validation';
import { EnabledValidation } from '../validations/element-validations/enabled.validation';
import { PageTitleValidation } from '../validations/element-validations/pageTitle.validation';
import { TextValidation } from '../validations/element-validations/text.validation';
import { ValueValidation } from '../validations/element-validations/value.validation';
import { VisibilityValidation } from '../validations/element-validations/visibility.validation';

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
    ['pageTitle', new PageTitleValidation()],
    ['dashboardNotification', new DashboardNotificationValidation()],
    ['dashboardTask', new DashboardTasksValidation()],
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

  static getAvailableValidations(): string[] {
    return Array.from(this.validations.keys());
  }
}
