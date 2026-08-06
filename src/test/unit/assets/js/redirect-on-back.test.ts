/**
 * @jest-environment jsdom
 */

import { redirectTo } from '../../../../main/assets/js/navigate';
import { initRedirectOnBack } from '../../../../main/assets/js/redirect-on-back';

jest.mock('../../../../main/assets/js/navigate', () => ({
  redirectTo: jest.fn(),
}));

const redirectToMock = redirectTo as jest.Mock;

describe('initRedirectOnBack', () => {
  const dashboardUrl = '/case/1234567890123456/dashboard';

  let pushStateSpy: jest.SpyInstance;
  // Listeners are added to the shared jsdom `window`; track them so they can be
  // torn down after each test and don't leak into the next one.
  const addedListeners: [string, EventListenerOrEventListenerObject][] = [];

  beforeEach(() => {
    document.body.innerHTML = '';
    redirectToMock.mockReset();
    addedListeners.length = 0;

    const addEventListener = window.addEventListener.bind(window);
    jest.spyOn(window, 'addEventListener').mockImplementation((type, listener, options) => {
      addedListeners.push([type, listener as EventListenerOrEventListenerObject]);
      return addEventListener(type, listener, options);
    });

    pushStateSpy = jest.spyOn(window.history, 'pushState').mockImplementation(() => {});
  });

  afterEach(() => {
    for (const [type, listener] of addedListeners) {
      window.removeEventListener(type, listener);
    }
    jest.restoreAllMocks();
  });

  const addMarker = (url?: string): void => {
    const span = document.createElement('span');
    span.id = 'redirect-on-back';
    if (url !== undefined) {
      span.dataset.dashboardUrl = url;
    }
    span.hidden = true;
    document.body.appendChild(span);
  };

  const pageshow = (persisted = false): void => {
    const event = new Event('pageshow');
    Object.defineProperty(event, 'persisted', { value: persisted });
    window.dispatchEvent(event);
  };

  it('does nothing when the marker is absent', () => {
    initRedirectOnBack();

    pageshow();
    window.dispatchEvent(new PopStateEvent('popstate'));

    expect(pushStateSpy).not.toHaveBeenCalled();
    expect(redirectToMock).not.toHaveBeenCalled();
  });

  it('does nothing when the marker has no dashboard url', () => {
    addMarker();

    initRedirectOnBack();

    pageshow();
    window.dispatchEvent(new PopStateEvent('popstate'));

    expect(pushStateSpy).not.toHaveBeenCalled();
    expect(redirectToMock).not.toHaveBeenCalled();
  });

  it('does not arm synchronously — the guard is pushed on pageshow', () => {
    // Regression guard: a synchronous pushState at load is dropped by the browser
    // when we arrive via a redirect (e.g. the GOV.UK Pay return 303), so the
    // guard must be deferred to pageshow.
    addMarker(dashboardUrl);

    initRedirectOnBack();
    expect(pushStateSpy).not.toHaveBeenCalled();

    pageshow();
    expect(pushStateSpy).toHaveBeenCalledTimes(1);
  });

  it('pushes a duplicate history entry on show and redirects to the dashboard on Back', () => {
    addMarker(dashboardUrl);

    initRedirectOnBack();
    pageshow();

    expect(pushStateSpy).toHaveBeenCalledTimes(1);
    expect(redirectToMock).not.toHaveBeenCalled();

    window.dispatchEvent(new PopStateEvent('popstate'));

    expect(redirectToMock).toHaveBeenCalledWith(dashboardUrl);
  });

  it('re-pushes the guard on every Back so deeper history stacks stay trapped', () => {
    addMarker(dashboardUrl);

    initRedirectOnBack();
    pageshow();
    expect(pushStateSpy).toHaveBeenCalledTimes(1);

    window.dispatchEvent(new PopStateEvent('popstate'));
    // Guard is renewed before redirecting so a subsequent Back is caught too.
    expect(pushStateSpy).toHaveBeenCalledTimes(2);

    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(pushStateSpy).toHaveBeenCalledTimes(3);
    expect(redirectToMock).toHaveBeenCalledTimes(2);
    expect(redirectToMock).toHaveBeenNthCalledWith(2, dashboardUrl);
  });

  it('re-arms on both initial and back/forward-cache pageshow events', () => {
    addMarker(dashboardUrl);

    initRedirectOnBack();

    pageshow(false); // initial display
    expect(pushStateSpy).toHaveBeenCalledTimes(1);

    pageshow(true); // restored from bfcache
    expect(pushStateSpy).toHaveBeenCalledTimes(2);
  });

  it('registers a single popstate listener regardless of repeated pageshow re-arms', () => {
    addMarker(dashboardUrl);

    initRedirectOnBack();

    pageshow(true);
    pageshow(true);

    redirectToMock.mockClear();
    window.dispatchEvent(new PopStateEvent('popstate'));

    // A single Back must redirect exactly once — no accumulated listeners.
    expect(redirectToMock).toHaveBeenCalledTimes(1);
  });
});
