import { IValidation } from '../interfaces/validation.interface';
import { BannerAlertValidation } from '../validations/element-validations/bannerAlert.validation';
import { ErrorMessageValidation } from '../validations/element-validations/error-message.validation';
import { FormLabelValueValidation } from '../validations/element-validations/formLabelValue.validation';
import { OptionListValidation } from '../validations/element-validations/optionList.validation';
import { MainHeaderValidation } from '../validations/element-validations/pageHeader.validation';
import { RadioButtonValidation } from '../validations/element-validations/radioButton.validation';
import { TextValidation } from '../validations/element-validations/text.validation';
import { VisibilityValidation } from '../validations/element-validations/visibility.validation';

export class ValidationRegistry {
  private static validations: Map<string, IValidation> = new Map([
    ['text', new TextValidation()],
    ['visibility', new VisibilityValidation()],
    ['bannerAlert', new BannerAlertValidation()],
    ['formLabelValue', new FormLabelValueValidation()],
    ['optionList', new OptionListValidation()],
    ['mainHeader', new MainHeaderValidation()],
    ['errorMessage', new ErrorMessageValidation()],
    ['radioButtonChecked', new RadioButtonValidation()]
  ]);

  static getValidation(validationType: string): IValidation {
    const validation = this.validations.get(validationType);
    if (!validation) {
      throw new Error(`Validation '${validationType}' is not registered. Available validations: ${Array.from(this.validations.keys()).join(', ')}`);
    }
    return validation;
  }

  static getAvailableValidations(): string[] {
    return Array.from(this.validations.keys());
  }
}
