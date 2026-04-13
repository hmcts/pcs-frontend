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
 * @augments {ConfigurableComponent<ButtonMenuConfig>}
 */
class ButtonMenu extends ConfigurableComponent {
  /**
   * @param {Element | null} $root - HTML element to use for button menu
   * @param {ButtonMenuConfig} [config] - Button menu config
   */
  constructor($root, config = {}) {
    super($root, config);

    // If only one button is provided, don't initiate a menu and toggle button
    // if classes have been provided for the toggleButton, apply them to the single item
    if (this.$root.children.length === 1) {
      const $button = this.$root.children[0];
      $button.classList.forEach(className => {
        if (className.startsWith('govuk-button-')) {
          $button.classList.remove(className);
        }
        $button.classList.remove('moj-button-menu__item');
        $button.classList.add('moj-button-menu__single-button');
      });
      if (this.config.buttonClasses) {
        $button.classList.add(...this.config.buttonClasses.split(' '));
      }
    }
    // Otherwise initialise a button menu
    if (this.$root.children.length > 1) {
      this.initMenu();
    }
  }
  initMenu() {
    this.$menu = this.createMenu();
    this.$root.insertAdjacentHTML('afterbegin', this.toggleTemplate());
    this.setupMenuItems();
    this.$menuToggle = this.$root.querySelector(':scope > button');
    this.$items = this.$menu.querySelectorAll('a, button');
    this.$menuToggle.addEventListener('click', event => {
      this.toggleMenu(event);
    });
    this.$root.addEventListener('keydown', event => {
      this.handleKeyDown(event);
    });
    document.addEventListener('click', event => {
      if (event.target instanceof Node && !this.$root.contains(event.target)) {
        this.closeMenu(false);
      }
    });
  }
  createMenu() {
    const $menu = document.createElement('ul');
    $menu.setAttribute('role', 'list');
    $menu.hidden = true;
    $menu.classList.add('moj-button-menu__wrapper');
    if (this.config.alignMenu === 'right') {
      $menu.classList.add('moj-button-menu__wrapper--right');
    }
    this.$root.appendChild($menu);
    while (this.$root.firstChild !== $menu) {
      $menu.appendChild(this.$root.firstChild);
    }
    return $menu;
  }
  setupMenuItems() {
    Array.from(this.$menu.children).forEach($menuItem => {
      // wrap item in li tag
      const $listItem = document.createElement('li');
      this.$menu.insertBefore($listItem, $menuItem);
      $listItem.appendChild($menuItem);
      $menuItem.setAttribute('tabindex', '-1');
      if ($menuItem.tagName === 'BUTTON') {
        $menuItem.setAttribute('type', 'button');
      }
      $menuItem.classList.forEach(className => {
        if (className.startsWith('govuk-button')) {
          $menuItem.classList.remove(className);
        }
      });

      // add a slight delay after click before closing the menu, makes it *feel* better
      $menuItem.addEventListener('click', () => {
        setTimeout(() => {
          this.closeMenu(false);
        }, 50);
      });
    });
  }
  toggleTemplate() {
    return `
    <button type="button" class="govuk-button moj-button-menu__toggle-button ${this.config.buttonClasses || ''}" aria-haspopup="true" aria-expanded="false">
      <span>
       ${this.config.buttonText}
       <svg width="11" height="5" viewBox="0 0 11 5"  xmlns="http://www.w3.org/2000/svg">
         <path d="M5.5 0L11 5L0 5L5.5 0Z" fill="currentColor"/>
       </svg>
      </span>
    </button>`;
  }

  /**
   * @returns {boolean}
   */
  isOpen() {
    return this.$menuToggle.getAttribute('aria-expanded') === 'true';
  }

  /**
   * @param {MouseEvent} event - Click event
   */
  toggleMenu(event) {
    event.preventDefault();

    // If menu is triggered with mouse don't move focus to first item
    const keyboardEvent = event.detail === 0;
    const focusIndex = keyboardEvent ? 0 : -1;
    if (this.isOpen()) {
      this.closeMenu();
    } else {
      this.openMenu(focusIndex);
    }
  }

  /**
   * Opens the menu and optionally sets the focus to the item with given index
   *
   * @param {number} focusIndex - The index of the item to focus
   */
  openMenu(focusIndex = 0) {
    this.$menu.hidden = false;
    this.$menuToggle.setAttribute('aria-expanded', 'true');
    if (focusIndex !== -1) {
      this.focusItem(focusIndex);
    }
  }

  /**
   * Closes the menu and optionally returns focus back to menuToggle
   *
   * @param {boolean} moveFocus - whether to return focus to the toggle button
   */
  closeMenu(moveFocus = true) {
    this.$menu.hidden = true;
    this.$menuToggle.setAttribute('aria-expanded', 'false');
    if (moveFocus) {
      this.$menuToggle.focus();
    }
  }

  /**
   * Focuses the menu item at the specified index
   *
   * @param {number} index - the index of the item to focus
   */
  focusItem(index) {
    if (index >= this.$items.length) index = 0;
    if (index < 0) index = this.$items.length - 1;
    const $menuItem = this.$items.item(index);
    if ($menuItem) {
      $menuItem.focus();
    }
  }
  currentFocusIndex() {
    const $activeElement = document.activeElement;
    const $menuItems = Array.from(this.$items);
    return ($activeElement instanceof HTMLAnchorElement || $activeElement instanceof HTMLButtonElement) && $menuItems.indexOf($activeElement);
  }

  /**
   * @param {KeyboardEvent} event - Keydown event
   */
  handleKeyDown(event) {
    if (event.target === this.$menuToggle) {
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          this.openMenu();
          break;
        case 'ArrowUp':
          event.preventDefault();
          this.openMenu(this.$items.length - 1);
          break;
      }
    }
    if (event.target instanceof Node && this.$menu.contains(event.target) && this.isOpen()) {
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          if (this.currentFocusIndex() !== -1) {
            this.focusItem(this.currentFocusIndex() + 1);
          }
          break;
        case 'ArrowUp':
          event.preventDefault();
          if (this.currentFocusIndex() !== -1) {
            this.focusItem(this.currentFocusIndex() - 1);
          }
          break;
        case 'Home':
          event.preventDefault();
          this.focusItem(0);
          break;
        case 'End':
          event.preventDefault();
          this.focusItem(this.$items.length - 1);
          break;
      }
    }
    if (event.key === 'Escape' && this.isOpen()) {
      this.closeMenu();
    }
    if (event.key === 'Tab' && this.isOpen()) {
      this.closeMenu(false);
    }
  }

  /**
   * Name for the component used when initialising using data-module attributes.
   */
}

/**
 * @typedef {object} ButtonMenuConfig
 * @property {string} [buttonText='Actions'] - Label for the toggle button
 * @property {"left" | "right"} [alignMenu='left'] - the alignment of the menu
 * @property {string} [buttonClasses='govuk-button--secondary'] - css classes applied to the toggle button
 */

/**
 * @import { Schema } from 'govuk-frontend/dist/govuk/common/configuration.mjs'
 */
ButtonMenu.moduleName = 'moj-button-menu';
/**
 * Button menu config
 *
 * @type {ButtonMenuConfig}
 */
ButtonMenu.defaults = Object.freeze({
  buttonText: 'Actions',
  alignMenu: 'left',
  buttonClasses: ''
});
/**
 * Button menu config schema
 *
 * @type {Schema<ButtonMenuConfig>}
 */
ButtonMenu.schema = Object.freeze(/** @type {const} */{
  properties: {
    buttonText: {
      type: 'string'
    },
    buttonClasses: {
      type: 'string'
    },
    alignMenu: {
      type: 'string'
    }
  }
});

export { ButtonMenu };
//# sourceMappingURL=button-menu.bundle.mjs.map
