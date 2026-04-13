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
 * @augments {ConfigurableComponent<SearchToggleConfig>}
 */
class SearchToggle extends ConfigurableComponent {
  /**
   * @param {Element | null} $root - HTML element to use for search toggle
   * @param {SearchToggleConfig} [config] - Search toggle config
   */
  constructor($root, config = {}) {
    var _this$config$searchCo, _this$config$toggleBu;
    super($root, config);
    const $searchContainer = (_this$config$searchCo = this.config.searchContainer.element) != null ? _this$config$searchCo : this.$root.querySelector(this.config.searchContainer.selector);
    const $toggleButtonContainer = (_this$config$toggleBu = this.config.toggleButtonContainer.element) != null ? _this$config$toggleBu : this.$root.querySelector(this.config.toggleButtonContainer.selector);
    if (!$searchContainer || !$toggleButtonContainer || !($searchContainer instanceof HTMLElement) || !($toggleButtonContainer instanceof HTMLElement)) {
      return this;
    }
    this.$searchContainer = $searchContainer;
    this.$toggleButtonContainer = $toggleButtonContainer;
    const svg = '<svg viewBox="0 0 20 20" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" class="moj-search-toggle__button__icon"><path d="M7.433,12.5790048 C6.06762625,12.5808611 4.75763941,12.0392925 3.79217348,11.0738265 C2.82670755,10.1083606 2.28513891,8.79837375 2.28699522,7.433 C2.28513891,6.06762625 2.82670755,4.75763941 3.79217348,3.79217348 C4.75763941,2.82670755 6.06762625,2.28513891 7.433,2.28699522 C8.79837375,2.28513891 10.1083606,2.82670755 11.0738265,3.79217348 C12.0392925,4.75763941 12.5808611,6.06762625 12.5790048,7.433 C12.5808611,8.79837375 12.0392925,10.1083606 11.0738265,11.0738265 C10.1083606,12.0392925 8.79837375,12.5808611 7.433,12.5790048 L7.433,12.5790048 Z M14.293,12.579 L13.391,12.579 L13.071,12.269 C14.2300759,10.9245158 14.8671539,9.20813198 14.866,7.433 C14.866,3.32786745 11.5381325,-1.65045755e-15 7.433,-1.65045755e-15 C3.32786745,-1.65045755e-15 -1.65045755e-15,3.32786745 -1.65045755e-15,7.433 C-1.65045755e-15,11.5381325 3.32786745,14.866 7.433,14.866 C9.208604,14.8671159 10.9253982,14.2296624 12.27,13.07 L12.579,13.39 L12.579,14.294 L18.296,20 L20,18.296 L14.294,12.579 L14.293,12.579 Z"></path></svg>';
    this.$toggleButton = document.createElement('button');
    this.$toggleButton.setAttribute('class', 'moj-search-toggle__button');
    this.$toggleButton.setAttribute('type', 'button');
    this.$toggleButton.setAttribute('aria-haspopup', 'true');
    this.$toggleButton.setAttribute('aria-expanded', 'false');
    this.$toggleButton.innerHTML = `${this.config.toggleButton.text} ${svg}`;
    this.$toggleButton.addEventListener('click', this.onToggleButtonClick.bind(this));
    this.$toggleButtonContainer.append(this.$toggleButton);
    document.addEventListener('click', this.onDocumentClick.bind(this));
    document.addEventListener('focusin', this.onDocumentClick.bind(this));
  }
  showMenu() {
    this.$toggleButton.setAttribute('aria-expanded', 'true');
    this.$searchContainer.classList.remove('moj-js-hidden');
    this.$searchContainer.querySelector('input').focus();
  }
  hideMenu() {
    this.$searchContainer.classList.add('moj-js-hidden');
    this.$toggleButton.setAttribute('aria-expanded', 'false');
  }
  onToggleButtonClick() {
    if (this.$toggleButton.getAttribute('aria-expanded') === 'false') {
      this.showMenu();
    } else {
      this.hideMenu();
    }
  }

  /**
   * @param {MouseEvent | FocusEvent} event
   */
  onDocumentClick(event) {
    if (event.target instanceof Node && !this.$toggleButtonContainer.contains(event.target) && !this.$searchContainer.contains(event.target)) {
      this.hideMenu();
    }
  }

  /**
   * Name for the component used when initialising using data-module attributes.
   */
}

/**
 * @typedef {object} SearchToggleConfig
 * @property {object} [searchContainer] - Search config
 * @property {string} [searchContainer.selector] - Selector for search container
 * @property {Element | null} [searchContainer.element] - HTML element for search container
 * @property {object} [toggleButton] - Toggle button config
 * @property {string} [toggleButton.text] - Text for toggle button
 * @property {object} [toggleButtonContainer] - Toggle button container config
 * @property {string} [toggleButtonContainer.selector] - Selector for toggle button container
 * @property {Element | null} [toggleButtonContainer.element] - HTML element for toggle button container
 */

/**
 * @import { Schema } from 'govuk-frontend/dist/govuk/common/configuration.mjs'
 */
SearchToggle.moduleName = 'moj-search-toggle';
/**
 * Search toggle config
 *
 * @type {SearchToggleConfig}
 */
SearchToggle.defaults = Object.freeze({
  searchContainer: {
    selector: '.moj-search'
  },
  toggleButton: {
    text: 'Search'
  },
  toggleButtonContainer: {
    selector: '.moj-search-toggle__toggle'
  }
});
/**
 * Search toggle config schema
 *
 * @satisfies {Schema<SearchToggleConfig>}
 */
SearchToggle.schema = Object.freeze(/** @type {const} */{
  properties: {
    searchContainer: {
      type: 'object'
    },
    toggleButton: {
      type: 'object'
    },
    toggleButtonContainer: {
      type: 'object'
    }
  }
});

export { SearchToggle };
//# sourceMappingURL=search-toggle.bundle.mjs.map
