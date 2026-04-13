function isInitialised($root, moduleName) {
  return $root instanceof HTMLElement && $root.hasAttribute(`data-${moduleName}-init`);
}

/**
 * Checks if GOV.UK Frontend is supported on this page
 *
 * Some browsers will load and run our JavaScript but GOV.UK Frontend
 * won't be supported.
 *
 * @param {HTMLElement | null} [$scope] - (internal) `<body>` HTML element checked for browser support
 * @returns {boolean} Whether GOV.UK Frontend is supported on this page
 */
function isSupported($scope = document.body) {
  if (!$scope) {
    return false;
  }
  return $scope.classList.contains('govuk-frontend-supported');
}
function isArray(option) {
  return Array.isArray(option);
}
function isObject(option) {
  return !!option && typeof option === 'object' && !isArray(option);
}
function formatErrorMessage(Component, message) {
  return `${Component.moduleName}: ${message}`;
}

class GOVUKFrontendError extends Error {
  constructor(...args) {
    super(...args);
    this.name = 'GOVUKFrontendError';
  }
}
class SupportError extends GOVUKFrontendError {
  /**
   * Checks if GOV.UK Frontend is supported on this page
   *
   * @param {HTMLElement | null} [$scope] - HTML element `<body>` checked for browser support
   */
  constructor($scope = document.body) {
    const supportMessage = 'noModule' in HTMLScriptElement.prototype ? 'GOV.UK Frontend initialised without `<body class="govuk-frontend-supported">` from template `<script>` snippet' : 'GOV.UK Frontend is not supported in this browser';
    super($scope ? supportMessage : 'GOV.UK Frontend initialised without `<script type="module">`');
    this.name = 'SupportError';
  }
}
class ConfigError extends GOVUKFrontendError {
  constructor(...args) {
    super(...args);
    this.name = 'ConfigError';
  }
}
class ElementError extends GOVUKFrontendError {
  constructor(messageOrOptions) {
    let message = typeof messageOrOptions === 'string' ? messageOrOptions : '';
    if (isObject(messageOrOptions)) {
      const {
        component,
        identifier,
        element,
        expectedType
      } = messageOrOptions;
      message = identifier;
      message += element ? ` is not of type ${expectedType != null ? expectedType : 'HTMLElement'}` : ' not found';
      if (component) {
        message = formatErrorMessage(component, message);
      }
    }
    super(message);
    this.name = 'ElementError';
  }
}
class InitError extends GOVUKFrontendError {
  constructor(componentOrMessage) {
    const message = typeof componentOrMessage === 'string' ? componentOrMessage : formatErrorMessage(componentOrMessage, `Root element (\`$root\`) already initialised`);
    super(message);
    this.name = 'InitError';
  }
}

class Component {
  /**
   * Returns the root element of the component
   *
   * @protected
   * @returns {RootElementType} - the root element of component
   */
  get $root() {
    return this._$root;
  }
  constructor($root) {
    this._$root = void 0;
    const childConstructor = this.constructor;
    if (typeof childConstructor.moduleName !== 'string') {
      throw new InitError(`\`moduleName\` not defined in component`);
    }
    if (!($root instanceof childConstructor.elementType)) {
      throw new ElementError({
        element: $root,
        component: childConstructor,
        identifier: 'Root element (`$root`)',
        expectedType: childConstructor.elementType.name
      });
    } else {
      this._$root = $root;
    }
    childConstructor.checkSupport();
    this.checkInitialised();
    const moduleName = childConstructor.moduleName;
    this.$root.setAttribute(`data-${moduleName}-init`, '');
  }
  checkInitialised() {
    const constructor = this.constructor;
    const moduleName = constructor.moduleName;
    if (moduleName && isInitialised(this.$root, moduleName)) {
      throw new InitError(constructor);
    }
  }
  static checkSupport() {
    if (!isSupported()) {
      throw new SupportError();
    }
  }
}

/**
 * @typedef ChildClass
 * @property {string} moduleName - The module name that'll be looked for in the DOM when initialising the component
 */

/**
 * @typedef {typeof Component & ChildClass} ChildClassConstructor
 */
Component.elementType = HTMLElement;

const configOverride = Symbol.for('configOverride');
class ConfigurableComponent extends Component {
  [configOverride](param) {
    return {};
  }

  /**
   * Returns the root element of the component
   *
   * @protected
   * @returns {ConfigurationType} - the root element of component
   */
  get config() {
    return this._config;
  }
  constructor($root, config) {
    super($root);
    this._config = void 0;
    const childConstructor = this.constructor;
    if (!isObject(childConstructor.defaults)) {
      throw new ConfigError(formatErrorMessage(childConstructor, 'Config passed as parameter into constructor but no defaults defined'));
    }
    const datasetConfig = normaliseDataset(childConstructor, this._$root.dataset);
    this._config = mergeConfigs(childConstructor.defaults, config != null ? config : {}, this[configOverride](datasetConfig), datasetConfig);
  }
}
function normaliseString(value, property) {
  const trimmedValue = value ? value.trim() : '';
  let output;
  let outputType = property == null ? void 0 : property.type;
  if (!outputType) {
    if (['true', 'false'].includes(trimmedValue)) {
      outputType = 'boolean';
    }
    if (trimmedValue.length > 0 && isFinite(Number(trimmedValue))) {
      outputType = 'number';
    }
  }
  switch (outputType) {
    case 'boolean':
      output = trimmedValue === 'true';
      break;
    case 'number':
      output = Number(trimmedValue);
      break;
    default:
      output = value;
  }
  return output;
}
function normaliseDataset(Component, dataset) {
  if (!isObject(Component.schema)) {
    throw new ConfigError(formatErrorMessage(Component, 'Config passed as parameter into constructor but no schema defined'));
  }
  const out = {};
  const entries = Object.entries(Component.schema.properties);
  for (const entry of entries) {
    const [namespace, property] = entry;
    const field = namespace.toString();
    if (field in dataset) {
      out[field] = normaliseString(dataset[field], property);
    }
    if ((property == null ? void 0 : property.type) === 'object') {
      out[field] = extractConfigByNamespace(Component.schema, dataset, namespace);
    }
  }
  return out;
}
function mergeConfigs(...configObjects) {
  const formattedConfigObject = {};
  for (const configObject of configObjects) {
    for (const key of Object.keys(configObject)) {
      const option = formattedConfigObject[key];
      const override = configObject[key];
      if (isObject(option) && isObject(override)) {
        formattedConfigObject[key] = mergeConfigs(option, override);
      } else {
        formattedConfigObject[key] = override;
      }
    }
  }
  return formattedConfigObject;
}
function extractConfigByNamespace(schema, dataset, namespace) {
  const property = schema.properties[namespace];
  if ((property == null ? void 0 : property.type) !== 'object') {
    return;
  }
  const newObject = {
    [namespace]: {}
  };
  for (const [key, value] of Object.entries(dataset)) {
    let current = newObject;
    const keyParts = key.split('.');
    for (const [index, name] of keyParts.entries()) {
      if (isObject(current)) {
        if (index < keyParts.length - 1) {
          if (!isObject(current[name])) {
            current[name] = {};
          }
          current = current[name];
        } else if (key !== namespace) {
          current[name] = normaliseString(value);
        }
      }
    }
  }
  return newObject[namespace];
}

/**
 * @param {Element} $element - Element to remove attribute value from
 * @param {string} attr - Attribute name
 * @param {string} value - Attribute value
 */
function removeAttributeValue($element, attr, value) {
  let re, m;
  if ($element.getAttribute(attr)) {
    if ($element.getAttribute(attr) === value) {
      $element.removeAttribute(attr);
    } else {
      re = new RegExp(`(^|\\s)${value}(\\s|$)`);
      m = $element.getAttribute(attr).match(re);
      if (m && m.length === 3) {
        $element.setAttribute(attr, $element.getAttribute(attr).replace(re, m[1] && m[2] ? ' ' : ''));
      }
    }
  }
}

/**
 * @param {Element} $element - Element to add attribute value to
 * @param {string} attr - Attribute name
 * @param {string} value - Attribute value
 */
function addAttributeValue($element, attr, value) {
  let re;
  if (!$element.getAttribute(attr)) {
    $element.setAttribute(attr, value);
  } else {
    re = new RegExp(`(^|\\s)${value}(\\s|$)`);
    if (!re.test($element.getAttribute(attr))) {
      $element.setAttribute(attr, `${$element.getAttribute(attr)} ${value}`);
    }
  }
}

/**
 * @augments {ConfigurableComponent<FormValidatorConfig, HTMLFormElement>}
 */
class FormValidator extends ConfigurableComponent {
  /**
   * @param {Element | null} $root - HTML element to use for form validator
   * @param {FormValidatorConfig} [config] - Form validator config
   */
  constructor($root, config = {}) {
    super($root, config);
    const $summary = this.config.summary.element || document.querySelector(this.config.summary.selector);
    if (!$summary || !($summary instanceof HTMLElement)) {
      return this;
    }
    this.$summary = $summary;
    this.errors = /** @type {ValidationError[]} */[];
    this.validators = /** @type {Validator[]} */[];
    this.originalTitle = document.title;
    this.$root.addEventListener('submit', this.onSubmit.bind(this));
  }
  escapeHtml(string = '') {
    return String(string).replace(/[&<>"'`=/]/g, name => FormValidator.entityMap[name]);
  }
  resetTitle() {
    document.title = this.originalTitle;
  }
  updateTitle() {
    document.title = `${this.errors.length} errors - ${document.title}`;
  }
  showSummary() {
    this.$summary.innerHTML = this.getSummaryHtml();
    this.$summary.classList.remove('moj-hidden');
    this.$summary.setAttribute('aria-labelledby', 'errorSummary-heading');
    this.$summary.focus();
  }
  getSummaryHtml() {
    let html = '<h2 id="error-summary-title" class="govuk-error-summary__title">There is a problem</h2>';
    html += '<div class="govuk-error-summary__body">';
    html += '<ul class="govuk-list govuk-error-summary__list">';
    for (const error of this.errors) {
      html += '<li>';
      html += `<a href="#${this.escapeHtml(error.fieldName)}">`;
      html += this.escapeHtml(error.message);
      html += '</a>';
      html += '</li>';
    }
    html += '</ul>';
    html += '</div>';
    return html;
  }
  hideSummary() {
    this.$summary.classList.add('moj-hidden');
    this.$summary.removeAttribute('aria-labelledby');
  }

  /**
   * @param {SubmitEvent} event - Form submit event
   */
  onSubmit(event) {
    this.removeInlineErrors();
    this.hideSummary();
    this.resetTitle();
    if (!this.validate()) {
      event.preventDefault();
      this.updateTitle();
      this.showSummary();
      this.showInlineErrors();
    }
  }
  showInlineErrors() {
    for (const error of this.errors) {
      this.showInlineError(error);
    }
  }

  /**
   * @param {ValidationError} error
   */
  showInlineError(error) {
    const $errorSpan = document.createElement('span');
    $errorSpan.id = `${error.fieldName}-error`;
    $errorSpan.classList.add('govuk-error-message');
    $errorSpan.innerHTML = this.escapeHtml(error.message);
    const $control = document.querySelector(`#${error.fieldName}`);
    const $fieldset = $control.closest('.govuk-fieldset');
    const $fieldContainer = ($fieldset || $control).closest('.govuk-form-group');
    const $label = $fieldContainer.querySelector('label');
    const $legend = $fieldContainer.querySelector('legend');
    $fieldContainer.classList.add('govuk-form-group--error');
    if ($fieldset && $legend) {
      $legend.after($errorSpan);
      $fieldContainer.setAttribute('aria-invalid', 'true');
      addAttributeValue($fieldset, 'aria-describedby', $errorSpan.id);
    } else if ($label && $control) {
      $label.after($errorSpan);
      $control.setAttribute('aria-invalid', 'true');
      addAttributeValue($control, 'aria-describedby', $errorSpan.id);
    }
  }
  removeInlineErrors() {
    for (const error of this.errors) {
      this.removeInlineError(error);
    }
  }

  /**
   * @param {ValidationError} error
   */
  removeInlineError(error) {
    const $errorSpan = document.querySelector(`#${error.fieldName}-error`);
    const $control = document.querySelector(`#${error.fieldName}`);
    const $fieldset = $control.closest('.govuk-fieldset');
    const $fieldContainer = ($fieldset || $control).closest('.govuk-form-group');
    const $label = $fieldContainer.querySelector('label');
    const $legend = $fieldContainer.querySelector('legend');
    $errorSpan.remove();
    $fieldContainer.classList.remove('govuk-form-group--error');
    if ($fieldset && $legend) {
      $fieldContainer.removeAttribute('aria-invalid');
      removeAttributeValue($fieldset, 'aria-describedby', $errorSpan.id);
    } else if ($label && $control) {
      $control.removeAttribute('aria-invalid');
      removeAttributeValue($control, 'aria-describedby', $errorSpan.id);
    }
  }

  /**
   * @param {string} fieldName - Field name
   * @param {ValidationRule[]} rules - Validation rules
   */
  addValidator(fieldName, rules) {
    this.validators.push({
      fieldName,
      rules,
      field: this.$root.elements.namedItem(fieldName)
    });
  }
  validate() {
    this.errors = [];

    /** @type {Validator | null} */
    let validator = null;

    /** @type {boolean | string} */
    let validatorReturnValue = true;
    let i;
    let j;
    for (i = 0; i < this.validators.length; i++) {
      validator = this.validators[i];
      for (j = 0; j < validator.rules.length; j++) {
        validatorReturnValue = validator.rules[j].method(validator.field, validator.rules[j].params);
        if (typeof validatorReturnValue === 'boolean' && !validatorReturnValue) {
          this.errors.push({
            fieldName: validator.fieldName,
            message: validator.rules[j].message
          });
          break;
        } else if (typeof validatorReturnValue === 'string') {
          this.errors.push({
            fieldName: validatorReturnValue,
            message: validator.rules[j].message
          });
          break;
        }
      }
    }
    return this.errors.length === 0;
  }

  /**
   * @type {Record<string, string>}
   */
}

/**
 * @typedef {object} FormValidatorConfig
 * @property {object} [summary] - Error summary config
 * @property {string} [summary.selector] - Selector for error summary
 * @property {Element | null} [summary.element] - HTML element for error summary
 */

/**
 * @typedef {object} ValidationRule
 * @property {(field: Validator['field'], params: Record<string, Validator['field']>) => boolean | string} method - Validation method
 * @property {string} message - Error message
 * @property {Record<string, Validator['field']>} [params] - Parameters for validation
 */

/**
 * @typedef {object} ValidationError
 * @property {string} fieldName - Name of the field
 * @property {string} message - Validation error message
 */

/**
 * @typedef {object} Validator
 * @property {string} fieldName - Name of the field
 * @property {ValidationRule[]} rules - Validation rules
 * @property {Element | RadioNodeList} field - Form field
 */

/**
 * @import { Schema } from 'govuk-frontend/dist/govuk/common/configuration.mjs'
 */
FormValidator.entityMap = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;'
};
/**
 * Name for the component used when initialising using data-module attributes.
 */
FormValidator.moduleName = 'moj-form-validator';
/**
 * Multi file upload default config
 *
 * @type {FormValidatorConfig}
 */
FormValidator.defaults = Object.freeze({
  summary: {
    selector: '.govuk-error-summary'
  }
});
/**
 * Multi file upload config schema
 *
 * @satisfies {Schema<FormValidatorConfig>}
 */
FormValidator.schema = Object.freeze(/** @type {const} */{
  properties: {
    summary: {
      type: 'object'
    }
  }
});

export { FormValidator };
//# sourceMappingURL=form-validator.bundle.mjs.map
