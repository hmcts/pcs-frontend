import type { FormFieldConfig } from '../../../interfaces/formFieldConfig.interface';

/**
 * Builds HTML string for subFields to be included in GOV.UK conditional reveals
 * This creates the HTML structure that GOV.UK expects for conditional content
 */
export function buildSubFieldsHTML(subFields: Record<string, FormFieldConfig>): string {
  if (!subFields || Object.keys(subFields).length === 0) {
    return '';
  }

  const htmlParts: string[] = [];

  for (const [subFieldName, subField] of Object.entries(subFields)) {
    if (!subField.component || !subField.componentType) {
      continue;
    }

    const component = subField.component;
    const componentType = subField.componentType;
    // Use the nested field name (e.g., "contactMethod.emailAddress")
    const fieldId = (component.id as string) || subField.name;
    const fieldName = (component.name as string) || subField.name;
    const label = (component.label as { text?: string })?.text || subFieldName;
    const hint = (component.hint as { text?: string })?.text;
    const errorMessage = (component.errorMessage as { text?: string })?.text;
    const value = (component.value as string) || '';
    const classes = (component.classes as string) || '';
    const attributes = (component.attributes as Record<string, unknown>) || {};

    // Build attributes string
    const attrs: string[] = [];
    attrs.push(`id="${fieldId}"`);
    attrs.push(`name="${fieldName}"`);
    if (classes) {
      attrs.push(`class="govuk-input ${classes}"`);
    } else {
      attrs.push('class="govuk-input"');
    }
    for (const [key, val] of Object.entries(attributes)) {
      if (typeof val === 'string' || typeof val === 'number') {
        attrs.push(`${key}="${String(val).replace(/"/g, '&quot;')}"`);
      } else if (typeof val === 'boolean' && val) {
        attrs.push(key);
      }
    }

    let fieldHTML = '';

    switch (componentType) {
      case 'input': {
        const maxlength = component.maxlength as number;
        const inputAttrs = [...attrs];
        if (maxlength) {
          inputAttrs.push(`maxlength="${maxlength}"`);
        }
        fieldHTML = `
          <div class="govuk-form-group${errorMessage ? ' govuk-form-group--error' : ''}">
            <label class="govuk-label" for="${fieldId}">${escapeHtml(label)}</label>
            ${hint ? `<div class="govuk-hint">${escapeHtml(hint)}</div>` : ''}
            ${errorMessage ? `<span class="govuk-error-message"><span class="govuk-visually-hidden">Error:</span> ${escapeHtml(errorMessage)}</span>` : ''}
            <input ${inputAttrs.join(' ')} value="${escapeHtml(value)}" type="text">
          </div>
        `;
        break;
      }
      case 'textarea': {
        const rows = (component.rows as number) || 5;
        const maxlength = component.maxlength as number;
        const textareaAttrs = attrs.filter(a => !a.startsWith('class='));
        textareaAttrs.push(`class="govuk-textarea${classes ? ' ' + classes : ''}"`);
        textareaAttrs.push(`rows="${rows}"`);
        if (maxlength) {
          textareaAttrs.push(`maxlength="${maxlength}"`);
        }
        fieldHTML = `
          <div class="govuk-form-group${errorMessage ? ' govuk-form-group--error' : ''}">
            <label class="govuk-label" for="${fieldId}">${escapeHtml(label)}</label>
            ${hint ? `<div class="govuk-hint">${escapeHtml(hint)}</div>` : ''}
            ${errorMessage ? `<span class="govuk-error-message"><span class="govuk-visually-hidden">Error:</span> ${escapeHtml(errorMessage)}</span>` : ''}
            <textarea ${textareaAttrs.join(' ')}>${escapeHtml(value)}</textarea>
          </div>
        `;
        break;
      }
      case 'characterCount': {
        const rows = (component.rows as number) || 5;
        const maxlength = component.maxlength as number;
        const textareaAttrs = attrs.filter(a => !a.startsWith('class='));
        textareaAttrs.push(`class="govuk-textarea govuk-js-character-count${classes ? ' ' + classes : ''}"`);
        textareaAttrs.push(`rows="${rows}"`);
        if (maxlength) {
          textareaAttrs.push(`maxlength="${maxlength}"`);
          textareaAttrs.push(`data-maxlength="${maxlength}"`);
        }
        fieldHTML = `
          <div class="govuk-form-group${errorMessage ? ' govuk-form-group--error' : ''}">
            <label class="govuk-label" for="${fieldId}">${escapeHtml(label)}</label>
            ${hint ? `<div class="govuk-hint">${escapeHtml(hint)}</div>` : ''}
            ${errorMessage ? `<span class="govuk-error-message"><span class="govuk-visually-hidden">Error:</span> ${escapeHtml(errorMessage)}</span>` : ''}
            <textarea ${textareaAttrs.join(' ')}>${escapeHtml(value)}</textarea>
            ${maxlength ? `<div class="govuk-character-count" data-module="govuk-character-count" data-maxlength="${maxlength}"><span class="govuk-character-count__message" aria-live="polite">You have ${maxlength} characters remaining</span></div>` : ''}
          </div>
        `;
        break;
      }
      default:
        // For other types, create a basic input
        fieldHTML = `
          <div class="govuk-form-group${errorMessage ? ' govuk-form-group--error' : ''}">
            <label class="govuk-label" for="${fieldId}">${escapeHtml(label)}</label>
            ${hint ? `<div class="govuk-hint">${escapeHtml(hint)}</div>` : ''}
            ${errorMessage ? `<span class="govuk-error-message"><span class="govuk-visually-hidden">Error:</span> ${escapeHtml(errorMessage)}</span>` : ''}
            <input ${attrs.join(' ')} value="${escapeHtml(value)}" type="text">
          </div>
        `;
    }

    htmlParts.push(fieldHTML.trim());
  }

  return htmlParts.join('\n');
}

/**
 * Escapes HTML special characters
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}
