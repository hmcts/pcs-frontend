import type { Environment } from 'nunjucks';

import type { FormFieldConfig } from '../../../interfaces/formFieldConfig.interface';

import { Logger } from '@modules/logger';

const logger = Logger.getLogger('form-builder-subFieldsRenderer');
/**
 * Builds HTML string for subFields to be included in GOV.UK conditional reveals
 * Uses nunjucks templates to render the HTML, letting nunjucks handle escaping and formatting
 */
export function buildSubFieldsHTML(subFields: Record<string, FormFieldConfig>, nunjucksEnv: Environment): string {
  if (!subFields || Object.keys(subFields).length === 0) {
    return '';
  }

  // Convert Record to array format expected by the template
  // Filter out fields without component/componentType
  const subFieldsArray = Object.values(subFields).filter(subField => subField.component && subField.componentType);

  if (subFieldsArray.length === 0) {
    return '';
  }

  try {
    return nunjucksEnv.render('components/subFields.njk', {
      subFields: subFieldsArray,
    });
  } catch (error) {
    // Fallback to empty string if rendering fails
    logger.error('Failed to render subFields template:', error);
    return '';
  }
}
