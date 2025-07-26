import fs from 'fs';
import path from 'path';

import { IValidation } from '../interfaces/validation.interface';
import { DashboardNotificationValidation } from '../validations/custom-validations/dashboardNotification.validation';
import { DashboardTasksValidation } from '../validations/custom-validations/dashboardTasks.validation';
import { AttributeValidation } from '../validations/element-validations/attribute.validation';
import { CheckedValidation } from '../validations/element-validations/checked.validation';
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

  static updateReadmeSection(): void {
    const readmePath = path.join(__dirname, '../../test-README.md');

    try {
      const currentContent = fs.readFileSync(readmePath, 'utf8');
      const updatedContent = this.syncReadmeWithRegistry(currentContent);

      if (updatedContent !== currentContent) {
        fs.writeFileSync(readmePath, updatedContent);
      }
    } catch (error) {
      throw new error(error.message);
    }
  }

  private static syncReadmeWithRegistry(content: string): string {
    const sectionHeader = '### Validations';
    const startIdx = content.indexOf(sectionHeader);

    if (startIdx === -1) {
      return content;
    }

    const endIdx = content.indexOf('###', startIdx + 1);
    const sectionEnd = endIdx === -1 ? content.length : endIdx;
    const beforeSection = content.slice(0, startIdx);
    const afterSection = content.slice(sectionEnd);
    const sectionContent = content.slice(startIdx, sectionEnd);

    const registeredValidations = new Set(this.getAvailableValidations());

    const lines = sectionContent.split('\n');
    const newLines: string[] = [sectionHeader]; // Start with header

    const tableLines = ['| Validation       | Example Usage |'];

    for (const line of lines) {
      const validationMatch = line.match(/^\| (.*?)\s*\|(.*)\|/);
      if (validationMatch && !line.includes('---')) {
        const validationName = validationMatch[1].trim();
        if (registeredValidations.has(validationName)) {
          tableLines.push(line);
          registeredValidations.delete(validationName);
        }
      }
    }
    registeredValidations.forEach(validation => {
      tableLines.push(`| ${validation.padEnd(15)} | \`performValidation('${validation}', ...)\` |`);
    });

    newLines.push(...tableLines, '\n'); // <-- This adds the blank line
    return beforeSection + newLines.join('\n') + afterSection;
  }
}
