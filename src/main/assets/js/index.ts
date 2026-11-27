/// <reference types="webpack-env" />
import '../scss/main.scss';
import cookieManager from '@hmcts/cookie-manager';
import { initAll } from 'govuk-frontend';

import { trackCookiePreferences } from './analytics';
import { initCounterClaimPaymentChoice } from './counter-claim-payment-choice';
import { initMultiFileUpload } from './multi-file-upload';
import { initOrderPanel } from './order-panel';
import { initPostcodeLookup } from './postcode-lookup';
import { initPostcodeSelection } from './postcode-select';
import { initRedirectOnBack } from './redirect-on-back';
import { initSessionTimeout } from './session-timeout';

// The order editor is large, so only the make order and review pages load it.
if (document.querySelector('#make-order-form')) {
  void import(/* webpackChunkName: "make-order" */ './make-order').then(({ initMakeOrder, startWithSavedOrderTab }) => {
    startWithSavedOrderTab(initAll);
    initMakeOrder();
  });
} else {
  initAll();
  if (document.querySelector('#review-order-form #order-editor')) {
    void import(/* webpackChunkName: "make-order" */ './make-order').then(({ initOrderReview }) => initOrderReview());
  }
}
initPostcodeSelection();
initPostcodeLookup();
initSessionTimeout();
initMultiFileUpload();
initRedirectOnBack();
initCounterClaimPaymentChoice();
initOrderPanel();

// Cookie consent, set up as in cui-ra. The banner and the cookies page form are only rendered when tracking is enabled.
if (document.querySelector('.cookie-banner, .cookie-preferences-form')) {
  trackCookiePreferences(cookieManager);

  cookieManager.init({
    userPreferences: {
      cookieName: 'pcs-cookie-preferences',
    },
    cookieBanner: {
      class: 'cookie-banner',
      actions: [
        {
          name: 'accept',
          buttonClass: 'cookie-banner-accept-button',
          confirmationClass: 'cookie-banner-accept-message',
          consent: true,
        },
        {
          name: 'reject',
          buttonClass: 'cookie-banner-reject-button',
          confirmationClass: 'cookie-banner-reject-message',
          consent: false,
        },
        {
          name: 'hide',
          buttonClass: 'cookie-banner-hide-button',
        },
      ],
    },
    preferencesForm: {
      class: 'cookie-preferences-form',
    },
    cookieManifest: [
      {
        categoryName: 'essential',
        optional: false,
        matchBy: 'exact',
        cookies: ['pcs_session', 'lang'],
      },
      {
        categoryName: 'apm',
        optional: true,
        matchBy: 'exact',
        cookies: ['dtCookie', 'dtLatC', 'dtPC', 'dtSa', 'rxVisitor', 'rxvt'],
      },
      {
        categoryName: 'analytics',
        optional: true,
        cookies: ['_ga'],
      },
    ],
  });
}
