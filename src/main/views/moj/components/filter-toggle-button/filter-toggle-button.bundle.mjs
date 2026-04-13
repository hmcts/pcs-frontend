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
 * @augments {ConfigurableComponent<FilterToggleButtonConfig>}
 */
class FilterToggleButton extends ConfigurableComponent {
  /**
   * @param {Element | null} $root - HTML element to use for filter toggle button
   * @param {FilterToggleButtonConfig} [config] - Filter toggle button config
   */
  constructor($root, config = {}) {
    var _this$config$toggleBu, _this$config$closeBut;
    super($root, config);
    const $toggleButtonContainer = (_this$config$toggleBu = this.config.toggleButtonContainer.element) != null ? _this$config$toggleBu : document.querySelector(this.config.toggleButtonContainer.selector);
    const $closeButtonContainer = (_this$config$closeBut = this.config.closeButtonContainer.element) != null ? _this$config$closeBut : this.$root.querySelector(this.config.closeButtonContainer.selector);
    if (!($toggleButtonContainer instanceof HTMLElement && $closeButtonContainer instanceof HTMLElement)) {
      return this;
    }
    this.$toggleButtonContainer = $toggleButtonContainer;
    this.$closeButtonContainer = $closeButtonContainer;
    this.createToggleButton();
    this.setupResponsiveChecks();
    this.$root.setAttribute('tabindex', '-1');
    if (this.config.startHidden) {
      this.hideMenu();
    }
  }
  setupResponsiveChecks() {
    this.mq = window.matchMedia(this.config.bigModeMediaQuery);
    this.mq.addListener(this.checkMode.bind(this));
    this.checkMode();
  }
  createToggleButton() {
    this.$menuButton = document.createElement('button');
    this.$menuButton.setAttribute('type', 'button');
    this.$menuButton.setAttribute('aria-haspopup', 'true');
    this.$menuButton.setAttribute('aria-expanded', 'false');
    this.$menuButton.className = `govuk-button ${this.config.toggleButton.classes}`;
    this.$menuButton.textContent = this.config.toggleButton.showText;
    this.$menuButton.addEventListener('click', this.onMenuButtonClick.bind(this));
    this.$toggleButtonContainer.append(this.$menuButton);
  }
  checkMode() {
    if (this.mq.matches) {
      this.enableBigMode();
    } else {
      this.enableSmallMode();
    }
  }
  enableBigMode() {
    this.showMenu();
    this.removeCloseButton();
  }
  enableSmallMode() {
    this.hideMenu();
    this.addCloseButton();
  }
  addCloseButton() {
    this.$closeButton = document.createElement('button');
    this.$closeButton.setAttribute('type', 'button');
    this.$closeButton.className = this.config.closeButton.classes;
    this.$closeButton.textContent = this.config.closeButton.text;
    this.$closeButton.addEventListener('click', this.onCloseClick.bind(this));
    this.$closeButtonContainer.append(this.$closeButton);
  }
  onCloseClick() {
    this.hideMenu();
    this.$menuButton.focus();
  }
  removeCloseButton() {
    if (this.$closeButton) {
      this.$closeButton.remove();
      this.$closeButton = null;
    }
  }
  hideMenu() {
    this.$menuButton.setAttribute('aria-expanded', 'false');
    this.$root.classList.add('moj-js-hidden');
    this.$menuButton.textContent = this.config.toggleButton.showText;
  }
  showMenu() {
    this.$menuButton.setAttribute('aria-expanded', 'true');
    this.$root.classList.remove('moj-js-hidden');
    this.$menuButton.textContent = this.config.toggleButton.hideText;
  }
  onMenuButtonClick() {
    this.toggle();
  }
  toggle() {
    if (this.$menuButton.getAttribute('aria-expanded') === 'false') {
      this.showMenu();
      this.$root.focus();
    } else {
      this.hideMenu();
    }
  }

  /**
   * Name for the component used when initialising using data-module attributes.
   */
}

/**
 * @typedef {object} FilterToggleButtonConfig
 * @property {string} [bigModeMediaQuery] - Media query for big mode
 * @property {boolean} [startHidden] - Whether to start hidden
 * @property {object} [toggleButton] - Toggle button config
 * @property {string} [toggleButton.showText] - Text for show button
 * @property {string} [toggleButton.hideText] - Text for hide button
 * @property {string} [toggleButton.classes] - Classes for toggle button
 * @property {object} [toggleButtonContainer] - Toggle button container config
 * @property {string} [toggleButtonContainer.selector] - Selector for toggle button container
 * @property {Element | null} [toggleButtonContainer.element] - HTML element for toggle button container
 * @property {object} [closeButton] - Close button config
 * @property {string} [closeButton.text] - Text for close button
 * @property {string} [closeButton.classes] - Classes for close button
 * @property {object} [closeButtonContainer] - Close button container config
 * @property {string} [closeButtonContainer.selector] - Selector for close button container
 * @property {Element | null} [closeButtonContainer.element] - HTML element for close button container
 */

/**
 * @import { Schema } from 'govuk-frontend/dist/govuk/common/configuration.mjs'
 */
FilterToggleButton.moduleName = 'moj-filter';
/**
 * Filter toggle button config
 *
 * @type {FilterToggleButtonConfig}
 */
FilterToggleButton.defaults = Object.freeze({
  bigModeMediaQuery: '(min-width: 48.0625em)',
  startHidden: true,
  toggleButton: {
    showText: 'Show filter',
    hideText: 'Hide filter',
    classes: 'govuk-button--secondary'
  },
  toggleButtonContainer: {
    selector: '.moj-action-bar__filter'
  },
  closeButton: {
    text: 'Close',
    classes: 'moj-filter__close'
  },
  closeButtonContainer: {
    selector: '.moj-filter__header-action'
  }
});
/**
 * Filter toggle button config schema
 *
 * @satisfies {Schema<FilterToggleButtonConfig>}
 */
FilterToggleButton.schema = Object.freeze(/** @type {const} */{
  properties: {
    bigModeMediaQuery: {
      type: 'string'
    },
    startHidden: {
      type: 'boolean'
    },
    toggleButton: {
      type: 'object'
    },
    toggleButtonContainer: {
      type: 'object'
    },
    closeButton: {
      type: 'object'
    },
    closeButtonContainer: {
      type: 'object'
    }
  }
});

export { FilterToggleButton };
//# sourceMappingURL=filter-toggle-button.bundle.mjs.map
