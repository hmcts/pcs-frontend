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

class PdsHeader extends Component {
  /**
   * @param {Element | null} $root - HTML element to use for PDS header
   */
  constructor($root) {
    super($root);
    this.initHeader();
  }
  initHeader() {
    this.$tabOpenClass = 'probation-common-header__toggle-open';
    const $userToggle = this.$root.querySelector('.probation-common-header__user-menu-toggle');
    const $userMenu = this.$root.querySelector('#probation-common-header-user-menu');
    const $servicesToggle = this.$root.querySelector('.probation-common-header__services-menu-toggle');
    const $servicesMenu = this.$root.querySelector('#probation-common-header-services-menu');
    if (!$userToggle || !$userMenu || !$servicesToggle || !$servicesMenu || !($userToggle instanceof HTMLElement) || !($userMenu instanceof HTMLElement) || !($servicesToggle instanceof HTMLElement) || !($servicesMenu instanceof HTMLElement)) {
      return 0;
    }
    this.hideFallbackLinks();
    $userToggle.removeAttribute('hidden');
    $servicesToggle.removeAttribute('hidden');
    this.closeTabs([[$userToggle, $userMenu], [$servicesToggle, $servicesMenu]]);
    $userToggle.addEventListener('click', _event => {
      this.closeTabs([[$servicesToggle, $servicesMenu]]);
      this.toggleMenu($userToggle, $userMenu);
    });
    $servicesToggle.addEventListener('click', _event => {
      this.closeTabs([[$userToggle, $userMenu]]);
      this.toggleMenu($servicesToggle, $servicesMenu);
    });
  }

  /**
   * @param {[any, any][]} tabTuples
   */
  closeTabs(tabTuples) {
    tabTuples.forEach(([toggle, menu]) => {
      if (menu && toggle) {
        menu.setAttribute('hidden', 'hidden');
        toggle.classList.remove(this.$tabOpenClass);
        toggle.parentElement.classList.remove('item-open');
        toggle.setAttribute('aria-expanded', 'false');
        if (toggle.dataset.textForShow) toggle.setAttribute('aria-label', toggle.dataset.textForShow);
      }
    });
  }

  /**
   * @param {HTMLElement} toggle
   * @param {HTMLElement} menu
   */
  toggleMenu(toggle, menu) {
    const isOpen = !menu.getAttribute('hidden');
    if (isOpen) {
      this.closeTabs([[toggle, menu]]);
    } else if (menu && toggle) {
      menu.removeAttribute('hidden');
      toggle.classList.add(this.$tabOpenClass);
      toggle.parentElement.classList.add('item-open');
      toggle.setAttribute('aria-expanded', 'true');
      if (toggle.dataset.textForHide) toggle.setAttribute('aria-label', toggle.dataset.textForHide);
    }
  }
  hideFallbackLinks() {
    const $userLink = this.$root.querySelector('.probation-common-header__user-menu-link');
    const $servicesLink = this.$root.querySelector('.probation-common-header__services-menu-link');
    if ($userLink) $userLink.setAttribute('hidden', 'hidden');
    if ($servicesLink) $servicesLink.setAttribute('hidden', 'hidden');
  }

  /**
   * Name for the component used when initialising using data-module attributes.
   */
}
PdsHeader.moduleName = 'pds-header';

export { PdsHeader };
//# sourceMappingURL=header.bundle.mjs.map
