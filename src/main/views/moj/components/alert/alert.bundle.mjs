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
 * GOV.UK Frontend helpers
 *
 * @todo Import from GOV.UK Frontend
 */

/**
 * Move focus to element
 *
 * Sets tabindex to -1 to make the element programmatically focusable,
 * but removes it on blur as the element doesn't need to be focused again.
 *
 * @template {HTMLElement} FocusElement
 * @param {FocusElement} $element - HTML element
 * @param {object} [options] - Handler options
 * @param {function(this: FocusElement): void} [options.onBeforeFocus] - Callback before focus
 * @param {function(this: FocusElement): void} [options.onBlur] - Callback on blur
 */
function setFocus($element, options = {}) {
  var _options$onBeforeFocu;
  const isFocusable = $element.getAttribute('tabindex');
  if (!isFocusable) {
    $element.setAttribute('tabindex', '-1');
  }

  /**
   * Handle element focus
   */
  function onFocus() {
    $element.addEventListener('blur', onBlur, {
      once: true
    });
  }

  /**
   * Handle element blur
   */
  function onBlur() {
    var _options$onBlur;
    (_options$onBlur = options.onBlur) == null || _options$onBlur.call($element);
    if (!isFocusable) {
      $element.removeAttribute('tabindex');
    }
  }

  // Add listener to reset element on blur, after focus
  $element.addEventListener('focus', onFocus, {
    once: true
  });

  // Focus element
  (_options$onBeforeFocu = options.onBeforeFocus) == null || _options$onBeforeFocu.call($element);
  $element.focus();
}

/**
 * @param {Element} $element - Element to remove attribute value from
 * @param {string} attr - Attribute name
 * @param {string} value - Attribute value
 */

/**
 * Find an elements preceding sibling
 *
 * Utility function to find an elements previous sibling matching the provided
 * selector.
 *
 * @param {Element | null} $element - Element to find siblings for
 * @param {string} [selector] - selector for required sibling
 */
function getPreviousSibling($element, selector) {
  if (!$element || !($element instanceof HTMLElement)) {
    return;
  }

  // Get the previous sibling element
  let $sibling = $element.previousElementSibling;

  // If the sibling matches our selector, use it
  // If not, jump to the next sibling and continue the loop
  while ($sibling) {
    if ($sibling.matches(selector)) return $sibling;
    $sibling = $sibling.previousElementSibling;
  }
}

/**
 * @param {Element | null} $element
 * @param {string} [selector]
 */
function findNearestMatchingElement($element, selector) {
  // If no element or selector is provided, return
  if (!$element || !($element instanceof HTMLElement) || !selector) {
    return;
  }

  // Start with the current element
  let $currentElement = $element;
  while ($currentElement) {
    // First check the current element
    if ($currentElement.matches(selector)) {
      return $currentElement;
    }

    // Check all previous siblings
    let $sibling = $currentElement.previousElementSibling;
    while ($sibling) {
      // Check if the sibling itself is a heading
      if ($sibling.matches(selector)) {
        return $sibling;
      }
      $sibling = $sibling.previousElementSibling;
    }

    // If no match found in siblings, move up to parent
    $currentElement = $currentElement.parentElement;
  }
}

/**
 * @augments {ConfigurableComponent<AlertConfig>}
 */
class Alert extends ConfigurableComponent {
  /**
   * @param {Element | null} $root - HTML element to use for alert
   * @param {AlertConfig} [config] - Alert config
   */
  constructor($root, config = {}) {
    super($root, config);

    /**
     * Focus the alert
     *
     * If `role="alert"` is set, focus the element to help some assistive
     * technologies prioritise announcing it.
     *
     * You can turn off the auto-focus functionality by setting
     * `data-disable-auto-focus="true"` in the component HTML. You might wish to
     * do this based on user research findings, or to avoid a clash with another
     * element which should be focused when the page loads.
     */
    if (this.$root.getAttribute('role') === 'alert' && !this.config.disableAutoFocus) {
      setFocus(this.$root);
    }
    this.$dismissButton = this.$root.querySelector('.moj-alert__dismiss');
    if (this.config.dismissible && this.$dismissButton) {
      this.$dismissButton.innerHTML = this.config.dismissText;
      this.$dismissButton.removeAttribute('hidden');
      this.$root.addEventListener('click', event => {
        if (event.target instanceof Node && this.$dismissButton.contains(event.target)) {
          this.dimiss();
        }
      });
    }
  }

  /**
   * Handle dismissing the alert
   */
  dimiss() {
    let $elementToRecieveFocus;

    // If a selector has been provided, attempt to find that element
    if (this.config.focusOnDismissSelector) {
      $elementToRecieveFocus = document.querySelector(this.config.focusOnDismissSelector);
    }

    // Is the next sibling another alert
    if (!$elementToRecieveFocus) {
      const $nextSibling = this.$root.nextElementSibling;
      if ($nextSibling && $nextSibling.matches('.moj-alert')) {
        $elementToRecieveFocus = $nextSibling;
      }
    }

    // Else try to find any preceding sibling alert or heading
    if (!$elementToRecieveFocus) {
      $elementToRecieveFocus = getPreviousSibling(this.$root, '.moj-alert, h1, h2, h3, h4, h5, h6');
    }

    // Else find the closest ancestor heading, or fallback to main, or last resort
    // use the body element
    if (!$elementToRecieveFocus) {
      $elementToRecieveFocus = findNearestMatchingElement(this.$root, 'h1, h2, h3, h4, h5, h6, main, body');
    }

    // If we have an element, place focus on it
    if ($elementToRecieveFocus instanceof HTMLElement) {
      setFocus($elementToRecieveFocus);
    }

    // Remove the alert
    this.$root.remove();
  }

  /**
   * Name for the component used when initialising using data-module attributes.
   */
}

/**
 * @typedef {object} AlertConfig
 * @property {boolean} [dismissible=false] - Can the alert be dismissed by the user
 * @property {string} [dismissText=Dismiss] - the label text for the dismiss button
 * @property {boolean} [disableAutoFocus=false] - whether the alert will be autofocused
 * @property {string} [focusOnDismissSelector] - CSS Selector for element to be focused on dismiss
 */

/**
 * @import { Schema } from 'govuk-frontend/dist/govuk/common/configuration.mjs'
 */
Alert.moduleName = 'moj-alert';
/**
 * Alert default config
 *
 * @type {AlertConfig}
 */
Alert.defaults = Object.freeze({
  dismissible: false,
  dismissText: 'Dismiss',
  disableAutoFocus: false
});
/**
 * Alert config schema
 *
 * @satisfies {Schema<AlertConfig>}
 */
Alert.schema = Object.freeze(/** @type {const} */{
  properties: {
    dismissible: {
      type: 'boolean'
    },
    dismissText: {
      type: 'string'
    },
    disableAutoFocus: {
      type: 'boolean'
    },
    focusOnDismissSelector: {
      type: 'string'
    }
  }
});

export { Alert };
//# sourceMappingURL=alert.bundle.mjs.map
