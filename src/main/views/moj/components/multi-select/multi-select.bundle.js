(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('govuk-frontend')) :
  typeof define === 'function' && define.amd ? define(['exports', 'govuk-frontend'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.MOJFrontend = global.MOJFrontend || {}, global.GOVUKFrontend));
})(this, (function (exports, govukFrontend) { 'use strict';

  /**
   * @augments {ConfigurableComponent<MultiSelectConfig>}
   */
  class MultiSelect extends govukFrontend.ConfigurableComponent {
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

  exports.MultiSelect = MultiSelect;

}));
//# sourceMappingURL=multi-select.bundle.js.map
