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

class AddAnother extends Component {
  /**
   * @param {Element | null} $root - HTML element to use for add another
   */
  constructor($root) {
    super($root);
    this.$root.addEventListener('click', this.onRemoveButtonClick.bind(this));
    this.$root.addEventListener('click', this.onAddButtonClick.bind(this));
    const $buttons = this.$root.querySelectorAll('.moj-add-another__add-button, moj-add-another__remove-button');
    $buttons.forEach($button => {
      if (!($button instanceof HTMLButtonElement)) {
        return;
      }
      $button.type = 'button';
    });
  }

  /**
   * @param {MouseEvent} event - Click event
   */
  onAddButtonClick(event) {
    const $button = event.target;
    if (!$button || !($button instanceof HTMLButtonElement) || !$button.classList.contains('moj-add-another__add-button')) {
      return;
    }
    const $items = this.getItems();
    const $item = this.getNewItem();
    if (!$item || !($item instanceof HTMLElement)) {
      return;
    }
    this.updateAttributes($item, $items.length);
    this.resetItem($item);
    const $firstItem = $items[0];
    if (!this.hasRemoveButton($firstItem)) {
      this.createRemoveButton($firstItem);
    }
    $items[$items.length - 1].after($item);
    const $input = $item.querySelector('input, textarea, select');
    if ($input && $input instanceof HTMLInputElement) {
      $input.focus();
    }
  }

  /**
   * @param {HTMLElement} $item - Add another item
   */
  hasRemoveButton($item) {
    return $item.querySelectorAll('.moj-add-another__remove-button').length;
  }
  getItems() {
    if (!this.$root) {
      return [];
    }
    const $items = Array.from(this.$root.querySelectorAll('.moj-add-another__item'));
    return $items.filter(item => item instanceof HTMLElement);
  }
  getNewItem() {
    const $items = this.getItems();
    const $item = $items[0].cloneNode(true);
    if (!$item || !($item instanceof HTMLElement)) {
      return;
    }
    if (!this.hasRemoveButton($item)) {
      this.createRemoveButton($item);
    }
    return $item;
  }

  /**
   * @param {HTMLElement} $item - Add another item
   * @param {number} index - Add another item index
   */
  updateAttributes($item, index) {
    $item.querySelectorAll('[data-name]').forEach($input => {
      if (!this.isValidInputElement($input)) {
        return;
      }
      const name = $input.getAttribute('data-name') || '';
      const id = $input.getAttribute('data-id') || '';
      const originalId = $input.id;
      $input.name = name.replace(/%index%/, `${index}`);
      $input.id = id.replace(/%index%/, `${index}`);
      const $label = $input.parentElement.querySelector('label') || $input.closest('label') || $item.querySelector(`[for="${originalId}"]`);
      if ($label && $label instanceof HTMLLabelElement) {
        $label.htmlFor = $input.id;
      }
    });
  }

  /**
   * @param {HTMLElement} $item - Add another item
   */
  createRemoveButton($item) {
    const $button = document.createElement('button');
    $button.type = 'button';
    $button.classList.add('govuk-button', 'govuk-button--secondary', 'moj-add-another__remove-button');
    $button.textContent = 'Remove';
    $item.append($button);
  }

  /**
   * @param {HTMLElement} $item - Add another item
   */
  resetItem($item) {
    $item.querySelectorAll('[data-name], [data-id]').forEach($input => {
      if (!this.isValidInputElement($input)) {
        return;
      }
      if ($input instanceof HTMLSelectElement) {
        $input.selectedIndex = -1;
        $input.value = '';
      } else if ($input instanceof HTMLTextAreaElement) {
        $input.value = '';
      } else {
        switch ($input.type) {
          case 'checkbox':
          case 'radio':
            $input.checked = false;
            break;
          default:
            $input.value = '';
        }
      }
    });
  }

  /**
   * @param {MouseEvent} event - Click event
   */
  onRemoveButtonClick(event) {
    const $button = event.target;
    if (!$button || !($button instanceof HTMLButtonElement) || !$button.classList.contains('moj-add-another__remove-button')) {
      return;
    }
    $button.closest('.moj-add-another__item').remove();
    const $items = this.getItems();
    if ($items.length === 1) {
      $items[0].querySelector('.moj-add-another__remove-button').remove();
    }
    $items.forEach(($item, index) => {
      this.updateAttributes($item, index);
    });
    this.focusHeading();
  }
  focusHeading() {
    const $heading = this.$root.querySelector('.moj-add-another__heading');
    if ($heading && $heading instanceof HTMLElement) {
      $heading.focus();
    }
  }

  /**
   * @param {Element} $input - the input to validate
   */
  isValidInputElement($input) {
    return $input instanceof HTMLInputElement || $input instanceof HTMLSelectElement || $input instanceof HTMLTextAreaElement;
  }

  /**
   * Name for the component used when initialising using data-module attributes.
   */
}
AddAnother.moduleName = 'moj-add-another';

export { AddAnother };
//# sourceMappingURL=add-another.bundle.mjs.map
