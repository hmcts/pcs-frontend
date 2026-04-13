(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('govuk-frontend')) :
  typeof define === 'function' && define.amd ? define(['exports', 'govuk-frontend'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.MOJFrontend = global.MOJFrontend || {}, global.GOVUKFrontend));
})(this, (function (exports, govukFrontend) { 'use strict';

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
  class Alert extends govukFrontend.ConfigurableComponent {
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

  exports.Alert = Alert;

}));
//# sourceMappingURL=alert.bundle.js.map
