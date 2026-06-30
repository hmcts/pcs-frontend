import { IValidation } from '../interfaces';
import {
  ErrorMessageValidation,
  PageContentValidation,
  PageNavigationValidation,
  VisibilityValidation,
} from '../validations/custom-validations';
import {
  BannerAlertValidation,
  FormLabelValueValidation,
  InputErrorValidation,
  InputTextValueValidation,
  MainHeaderValidation,
  OptionListValidation,
  RadioButtonValidation,
  SummaryListValueValidation,
  TextValidation,
  ValidateDocumentUnderSectionValidation,
  responseTableValidation,
} from '../validations/element-validations';

export class ValidationRegistry {
  private static validations: Map<string, IValidation> = new Map([
    ['text', new TextValidation()],
    ['textNotVisible', new TextValidation()],
    ['bannerAlert', new BannerAlertValidation()],
    ['formLabelValue', new FormLabelValueValidation()],
    ['summaryListValue', new SummaryListValueValidation()],
    ['optionList', new OptionListValidation()],
    ['mainHeader', new MainHeaderValidation()],
    ['errorMessage', new ErrorMessageValidation()],
    ['inputError', new InputErrorValidation()],
    ['radioButtonChecked', new RadioButtonValidation()],
    ['elementToBeVisible', new VisibilityValidation()],
    ['elementNotToBeVisible', new VisibilityValidation()],
    ['waitUntilElementDisappears', new VisibilityValidation()],
    ['autoValidatePageContent', new PageContentValidation()],
    ['pageNavigation', new PageNavigationValidation()],
    ['inputTextValue', new InputTextValueValidation()],
    ['validateDocumentUnderSection', new ValidateDocumentUnderSectionValidation()],
    ['responseTable', new responseTableValidation()],
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
