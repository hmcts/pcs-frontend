/**
 * @jest-environment jsdom
 */

import { redirectTo } from '../../../../main/assets/js/navigate';
import { initRedirectOnBack } from '../../../../main/assets/js/redirect-on-back';

jest.mock('../../../../main/assets/js/navigate', () => ({
  redirectTo: jest.fn(),
}));

const redirectToMock = redirectTo as jest.Mock;

// The immediate synchronous push plus the deferred re-pushes scheduled per arm.
const PUSHES_PER_ARM = 5;

describe('initRedirectOnBack', () => {
  const dashboardUrl = '/case/1234567890123456/dashboard';

  let pushStateSpy: jest.SpyInstance;
  // Listeners are added to the shared jsdom `window`; track them so they can be
  // torn down after each test and don't leak into the next one.
  const addedListeners: [string, EventListenerOrEventListenerObject][] = [];

  beforeEach(() => {
    jest.useFakeTimers();
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
    jest.clearAllTimers();
    jest.useRealTimers();
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
    jest.runAllTimers();
    window.dispatchEvent(new PopStateEvent('popstate'));

    expect(pushStateSpy).not.toHaveBeenCalled();
    expect(redirectToMock).not.toHaveBeenCalled();
  });

  it('does nothing when the marker has no dashboard url', () => {
    addMarker();

    initRedirectOnBack();

    pageshow();
    jest.runAllTimers();
    window.dispatchEvent(new PopStateEvent('popstate'));

    expect(pushStateSpy).not.toHaveBeenCalled();
    expect(redirectToMock).not.toHaveBeenCalled();
  });

  it('does not arm synchronously at init — it arms on pageshow', () => {
    addMarker(dashboardUrl);

    initRedirectOnBack();
    expect(pushStateSpy).not.toHaveBeenCalled();

    pageshow();
    expect(pushStateSpy).toHaveBeenCalledTimes(1); // immediate push
  });

  it('re-pushes the guard across a window so a redirect arrival still traps Back', () => {
    addMarker(dashboardUrl);

    initRedirectOnBack();
    pageshow();
    expect(pushStateSpy).toHaveBeenCalledTimes(1); // immediate

    jest.runAllTimers();
    expect(pushStateSpy).toHaveBeenCalledTimes(PUSHES_PER_ARM); // + deferred re-pushes
  });

  it('redirects to the dashboard on Back', () => {
    addMarker(dashboardUrl);

    initRedirectOnBack();
    pageshow();

    expect(redirectToMock).not.toHaveBeenCalled();

    window.dispatchEvent(new PopStateEvent('popstate'));

    expect(redirectToMock).toHaveBeenCalledWith(dashboardUrl);
  });

  it('re-pushes the guard on every Back so deeper history stacks stay trapped', () => {
    addMarker(dashboardUrl);

    initRedirectOnBack();
    pageshow();
    jest.runAllTimers();
    const armedPushes = pushStateSpy.mock.calls.length;

    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(pushStateSpy).toHaveBeenCalledTimes(armedPushes + 1);
    expect(redirectToMock).toHaveBeenCalledTimes(1);

    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(pushStateSpy).toHaveBeenCalledTimes(armedPushes + 2);
    expect(redirectToMock).toHaveBeenCalledTimes(2);
    expect(redirectToMock).toHaveBeenNthCalledWith(2, dashboardUrl);
  });

  it('re-arms on both initial and back/forward-cache pageshow events', () => {
    addMarker(dashboardUrl);

    initRedirectOnBack();

    pageshow(false); // initial display
    jest.runAllTimers();
    expect(pushStateSpy).toHaveBeenCalledTimes(PUSHES_PER_ARM);

    pageshow(true); // restored from bfcache
    jest.runAllTimers();
    expect(pushStateSpy).toHaveBeenCalledTimes(PUSHES_PER_ARM * 2);
  });

  it('registers a single popstate listener regardless of repeated pageshow re-arms', () => {
    addMarker(dashboardUrl);

    initRedirectOnBack();

    pageshow(true);
    pageshow(true);
    jest.runAllTimers();

    redirectToMock.mockClear();
    window.dispatchEvent(new PopStateEvent('popstate'));

    // A single Back must redirect exactly once — no accumulated listeners.
    expect(redirectToMock).toHaveBeenCalledTimes(1);
  });
});
