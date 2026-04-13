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
 * @augments {ConfigurableComponent<SortableTableConfig>}
 */
class SortableTable extends ConfigurableComponent {
  /**
   * @param {Element | null} $root - HTML element to use for sortable table
   * @param {SortableTableConfig} [config] - Sortable table config
   */
  constructor($root, config = {}) {
    super($root, config);
    const $head = $root == null ? void 0 : $root.querySelector('thead');
    const $body = $root == null ? void 0 : $root.querySelector('tbody');
    if (!$head || !$body) {
      return this;
    }
    this.$head = $head;
    this.$body = $body;
    this.$caption = this.$root.querySelector('caption');
    this.$upArrow = `<svg width="22" height="22" focusable="false" aria-hidden="true" role="img" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M6.5625 15.5L11 6.63125L15.4375 15.5H6.5625Z" fill="currentColor"/>
</svg>`;
    this.$downArrow = `<svg width="22" height="22" focusable="false" aria-hidden="true" role="img" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M15.4375 7L11 15.8687L6.5625 7L15.4375 7Z" fill="currentColor"/>
</svg>`;
    this.$upDownArrow = `<svg width="22" height="22" focusable="false" aria-hidden="true" role="img" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M8.1875 9.5L10.9609 3.95703L13.7344 9.5H8.1875Z" fill="currentColor"/>
<path d="M13.7344 12.0781L10.9609 17.6211L8.1875 12.0781H13.7344Z" fill="currentColor"/>
</svg>`;
    this.$headings = this.$head ? Array.from(this.$head.querySelectorAll('th')) : [];
    this.createHeadingButtons();
    this.updateCaption();
    this.updateDirectionIndicators();
    this.createStatusBox();
    this.initialiseSortedColumn();
    this.$head.addEventListener('click', this.onSortButtonClick.bind(this));
  }
  createHeadingButtons() {
    for (const $heading of this.$headings) {
      if ($heading.hasAttribute('aria-sort')) {
        this.createHeadingButton($heading);
      }
    }
  }

  /**
   * @param {HTMLTableCellElement} $heading
   */
  createHeadingButton($heading) {
    const index = this.$headings.indexOf($heading);
    const $button = document.createElement('button');
    $button.setAttribute('type', 'button');
    $button.setAttribute('data-index', `${index}`);
    $button.textContent = $heading.textContent;
    $heading.textContent = '';
    $heading.appendChild($button);
  }
  createStatusBox() {
    this.$status = document.createElement('div');
    this.$status.setAttribute('aria-atomic', 'true');
    this.$status.setAttribute('aria-live', 'polite');
    this.$status.setAttribute('class', 'govuk-visually-hidden');
    this.$status.setAttribute('role', 'status');
    this.$root.insertAdjacentElement('afterend', this.$status);
  }
  initialiseSortedColumn() {
    var _$sortButton$getAttri;
    const $rows = this.getTableRowsArray();
    const $heading = this.$root.querySelector('th[aria-sort="ascending"], th[aria-sort="descending"]');
    const $sortButton = $heading == null ? void 0 : $heading.querySelector('button');
    const sortDirection = $heading == null ? void 0 : $heading.getAttribute('aria-sort');
    const columnNumber = Number.parseInt((_$sortButton$getAttri = $sortButton == null ? void 0 : $sortButton.getAttribute('data-index')) != null ? _$sortButton$getAttri : '0', 10);
    if (!$heading || !$sortButton || !(sortDirection === 'ascending' || sortDirection === 'descending')) {
      return;
    }
    const $sortedRows = this.sort($rows, columnNumber, sortDirection);
    this.addRows($sortedRows);
  }

  /**
   * @param {MouseEvent} event - Click event
   */
  onSortButtonClick(event) {
    var _$button$getAttribute;
    const $target = /** @type {HTMLElement} */event.target;
    const $button = $target.closest('button');
    if (!$button || !($button instanceof HTMLButtonElement) || !$button.parentElement) {
      return;
    }
    const $heading = $button.parentElement;
    const sortDirection = $heading.getAttribute('aria-sort');
    const columnNumber = Number.parseInt((_$button$getAttribute = $button == null ? void 0 : $button.getAttribute('data-index')) != null ? _$button$getAttribute : '0', 10);
    const newSortDirection = sortDirection === 'none' || sortDirection === 'descending' ? 'ascending' : 'descending';
    const $rows = this.getTableRowsArray();
    const $sortedRows = this.sort($rows, columnNumber, newSortDirection);
    this.addRows($sortedRows);
    this.removeButtonStates();
    this.updateButtonState($button, newSortDirection);
    this.updateDirectionIndicators();
  }
  updateCaption() {
    if (!this.$caption) {
      return;
    }
    let assistiveText = this.$caption.querySelector('.govuk-visually-hidden');
    if (assistiveText) {
      return;
    }
    assistiveText = document.createElement('span');
    assistiveText.classList.add('govuk-visually-hidden');
    assistiveText.textContent = ' (column headers with buttons are sortable).';
    this.$caption.appendChild(assistiveText);
  }

  /**
   * @param {HTMLButtonElement} $button
   * @param {string} direction
   */
  updateButtonState($button, direction) {
    if (!(direction === 'ascending' || direction === 'descending')) {
      return;
    }
    $button.parentElement.setAttribute('aria-sort', direction);
    let message = this.config.statusMessage;
    message = message.replace(/%heading%/, $button.textContent);
    message = message.replace(/%direction%/, this.config[`${direction}Text`]);
    this.$status.textContent = message;
  }
  updateDirectionIndicators() {
    for (const $heading of this.$headings) {
      const $button = /** @type {HTMLButtonElement} */
      $heading.querySelector('button');
      if ($heading.hasAttribute('aria-sort') && $button) {
        var _$button$querySelecto;
        const direction = $heading.getAttribute('aria-sort');
        (_$button$querySelecto = $button.querySelector('svg')) == null || _$button$querySelecto.remove();
        switch (direction) {
          case 'ascending':
            $button.insertAdjacentHTML('beforeend', this.$upArrow);
            break;
          case 'descending':
            $button.insertAdjacentHTML('beforeend', this.$downArrow);
            break;
          default:
            $button.insertAdjacentHTML('beforeend', this.$upDownArrow);
        }
      }
    }
  }
  removeButtonStates() {
    for (const $heading of this.$headings) {
      $heading.setAttribute('aria-sort', 'none');
    }
  }

  /**
   * @param {HTMLTableRowElement[]} $rows
   */
  addRows($rows) {
    for (const $row of $rows) {
      this.$body.append($row);
    }
  }
  getTableRowsArray() {
    return Array.from(this.$body.querySelectorAll('tr'));
  }

  /**
   * @param {HTMLTableRowElement[]} $rows
   * @param {number} columnNumber
   * @param {string} sortDirection
   */
  sort($rows, columnNumber, sortDirection) {
    return $rows.sort(($rowA, $rowB) => {
      const $tdA = $rowA.querySelectorAll('td, th')[columnNumber];
      const $tdB = $rowB.querySelectorAll('td, th')[columnNumber];
      if (!$tdA || !$tdB || !($tdA instanceof HTMLElement) || !($tdB instanceof HTMLElement)) {
        return 0;
      }
      const valueA = sortDirection === 'ascending' ? this.getCellValue($tdA) : this.getCellValue($tdB);
      const valueB = sortDirection === 'ascending' ? this.getCellValue($tdB) : this.getCellValue($tdA);
      return !(typeof valueA === 'number' && typeof valueB === 'number') ? valueA.toString().localeCompare(valueB.toString()) : valueA - valueB;
    });
  }

  /**
   * @param {HTMLElement} $cell
   */
  getCellValue($cell) {
    const val = $cell.getAttribute('data-sort-value') || $cell.innerHTML;
    const valAsNumber = Number(val);
    return Number.isFinite(valAsNumber) ? valAsNumber // Exclude invalid numbers, infinity etc
    : val;
  }

  /**
   * Name for the component used when initialising using data-module attributes.
   */
}

/**
 * Sortable table config
 *
 * @typedef {object} SortableTableConfig
 * @property {string} [statusMessage] - Status message
 * @property {string} [ascendingText] - Ascending text
 * @property {string} [descendingText] - Descending text
 */

/**
 * @import { Schema } from 'govuk-frontend/dist/govuk/common/configuration.mjs'
 */
SortableTable.moduleName = 'moj-sortable-table';
/**
 * Sortable table config
 *
 * @type {SortableTableConfig}
 */
SortableTable.defaults = Object.freeze({
  statusMessage: 'Sort by %heading% (%direction%)',
  ascendingText: 'ascending',
  descendingText: 'descending'
});
/**
 * Sortable table config schema
 *
 * @satisfies {Schema<SortableTableConfig>}
 */
SortableTable.schema = Object.freeze(/** @type {const} */{
  properties: {
    statusMessage: {
      type: 'string'
    },
    ascendingText: {
      type: 'string'
    },
    descendingText: {
      type: 'string'
    }
  }
});

export { SortableTable };
//# sourceMappingURL=sortable-table.bundle.mjs.map
