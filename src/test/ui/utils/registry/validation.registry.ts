import { IValidation } from '../interfaces';
import {
  BannerAlertValidation,
  ErrorMessageValidation,
  FormLabelValueValidation,
  InputErrorValidation,
  MainHeaderValidation,
  OptionListValidation,
  RadioButtonValidation,
  TextValidation,
  VisibilityValidation,
} from '../validations/element-validations';
import { PageContentValidation } from '../validations/element-validations/pageContent.validation';

export class ValidationRegistry {
  private static validations: Map<string, IValidation> = new Map([
    ['text', new TextValidation()],
    ['bannerAlert', new BannerAlertValidation()],
    ['formLabelValue', new FormLabelValueValidation()],
    ['optionList', new OptionListValidation()],
    ['mainHeader', new MainHeaderValidation()],
    ['errorMessage', new ErrorMessageValidation()],
    ['inputError', new InputErrorValidation()],
    ['radioButtonChecked', new RadioButtonValidation()],
    ['elementToBeVisible', new VisibilityValidation()],
    ['elementNotToBeVisible', new VisibilityValidation()],
    ['waitUntilElementDisappears', new VisibilityValidation()],
    ['autoValidatePageContent', new PageContentValidation()],
  ]);

  static getValidation(validationType: string): IValidation {
    const validation = this.validations.get(validationType);
    if (!validation) {
      throw new Error(
        `Validation '${validationType}' is not registered. Available validations: ${Array.from(
          this.validations.keys()
        ).join(', ')}`
      );
    }
    return validation;
  }

  static getAvailableValidations(): string[] {
    return Array.from(this.validations.keys());
  }
}
