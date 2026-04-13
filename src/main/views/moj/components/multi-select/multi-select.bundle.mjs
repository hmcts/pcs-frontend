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
 * @augments {ConfigurableComponent<MultiSelectConfig>}
 */
class MultiSelect extends ConfigurableComponent {
  /**
   * @param {Element | null} $root - HTML element to use for multi select
   * @param {MultiSelectConfig} [config] - Multi select config
   */
  constructor($root, config = {}) {
    var _this$config$checkbox;
    super($root, config);
    const $container = this.$root.querySelector(`#${this.config.idPrefix}select-all`);
    const $checkboxes = /** @type {NodeListOf<HTMLInputElement>} */(_this$config$checkbox = this.config.checkboxes.items) != null ? _this$config$checkbox : this.$root.querySelectorAll(this.config.checkboxes.selector);
    if (!$container || !($container instanceof HTMLElement) || !$checkboxes.length) {
      return this;
    }
    this.setupToggle(this.config.idPrefix);
    this.$toggleButton = this.$toggle.querySelector('input');
    this.$toggleButton.addEventListener('click', this.onButtonClick.bind(this));
    this.$container = $container;
    this.$container.append(this.$toggle);
    this.$checkboxes = Array.from($checkboxes);
    this.$checkboxes.forEach($input => $input.addEventListener('click', this.onCheckboxClick.bind(this)));
    this.checked = config.checked || false;
  }
  setupToggle(idPrefix = '') {
    const id = `${idPrefix}checkboxes-all`;
    const $toggle = document.createElement('div');
    const $label = document.createElement('label');
    const $input = document.createElement('input');
    const $span = document.createElement('span');
    $toggle.classList.add('govuk-checkboxes__item', 'govuk-checkboxes--small', 'moj-multi-select__checkbox');
    $input.id = id;
    $input.type = 'checkbox';
    $input.classList.add('govuk-checkboxes__input');
    $label.setAttribute('for', id);
    $label.classList.add('govuk-label', 'govuk-checkboxes__label', 'moj-multi-select__toggle-label');
    $span.classList.add('govuk-visually-hidden');
    $span.textContent = 'Select all';
    $label.append($span);
    $toggle.append($input, $label);
    this.$toggle = $toggle;
  }
  onButtonClick() {
    if (this.checked) {
      this.uncheckAll();
      this.$toggleButton.checked = false;
    } else {
      this.checkAll();
      this.$toggleButton.checked = true;
    }
  }
  checkAll() {
    this.$checkboxes.forEach($input => {
      $input.checked = true;
    });
    this.checked = true;
  }
  uncheckAll() {
    this.$checkboxes.forEach($input => {
      $input.checked = false;
    });
    this.checked = false;
  }

  /**
   * @param {MouseEvent} event - Click event
   */
  onCheckboxClick(event) {
    if (!(event.target instanceof HTMLInputElement)) {
      return;
    }
    if (!event.target.checked) {
      this.$toggleButton.checked = false;
      this.checked = false;
    } else {
      if (this.$checkboxes.filter($input => $input.checked).length === this.$checkboxes.length) {
        this.$toggleButton.checked = true;
        this.checked = true;
      }
    }
  }

  /**
   * Name for the component used when initialising using data-module attributes.
   */
}

/**
 * Multi select config
 *
 * @typedef {object} MultiSelectConfig
 * @property {string} [idPrefix] - Prefix for the Select all" checkbox `id` attribute
 * @property {boolean} [checked] - Whether the "Select all" checkbox is checked
 * @property {object} [checkboxes] - Checkboxes config
 * @property {string} [checkboxes.selector] - Checkboxes query selector
 * @property {NodeListOf<HTMLInputElement>} [checkboxes.items] - Checkboxes query selector results
 */

/**
 * @import { Schema } from 'govuk-frontend/dist/govuk/common/configuration.mjs'
 */
MultiSelect.moduleName = 'moj-multi-select';
/**
 * Multi select config
 *
 * @type {MultiSelectConfig}
 */
MultiSelect.defaults = Object.freeze({
  idPrefix: '',
  checkboxes: {
    selector: 'tbody input.govuk-checkboxes__input'
  }
});
/**
 * Multi select config schema
 *
 * @satisfies {Schema<MultiSelectConfig>}
 */
MultiSelect.schema = Object.freeze(/** @type {const} */{
  properties: {
    idPrefix: {
      type: 'string'
    },
    checked: {
      type: 'boolean'
    },
    checkboxes: {
      type: 'object'
    }
  }
});

export { MultiSelect };
//# sourceMappingURL=multi-select.bundle.mjs.map
