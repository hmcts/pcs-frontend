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

  it('does nothing when the marker is absent', () => {
    initRedirectOnBack();

    window.dispatchEvent(new PopStateEvent('popstate'));

    expect(pushStateSpy).not.toHaveBeenCalled();
    expect(redirectToMock).not.toHaveBeenCalled();
  });

  it('does nothing when the marker has no dashboard url', () => {
    addMarker();

    initRedirectOnBack();

    window.dispatchEvent(new PopStateEvent('popstate'));

    expect(pushStateSpy).not.toHaveBeenCalled();
    expect(redirectToMock).not.toHaveBeenCalled();
  });

  it('pushes a duplicate history entry and redirects to the dashboard on Back', () => {
    addMarker(dashboardUrl);

    initRedirectOnBack();

    expect(pushStateSpy).toHaveBeenCalledTimes(1);
    expect(redirectToMock).not.toHaveBeenCalled();

    window.dispatchEvent(new PopStateEvent('popstate'));

    expect(redirectToMock).toHaveBeenCalledWith(dashboardUrl);
  });

  it('re-pushes the guard on every Back so deeper history stacks stay trapped', () => {
    addMarker(dashboardUrl);

    initRedirectOnBack();
    expect(pushStateSpy).toHaveBeenCalledTimes(1);

    window.dispatchEvent(new PopStateEvent('popstate'));
    // Guard is renewed before redirecting so a subsequent Back is caught too.
    expect(pushStateSpy).toHaveBeenCalledTimes(2);

    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(pushStateSpy).toHaveBeenCalledTimes(3);
    expect(redirectToMock).toHaveBeenCalledTimes(2);
    expect(redirectToMock).toHaveBeenNthCalledWith(2, dashboardUrl);
  });

  it('registers a single popstate listener regardless of bfcache re-arms', () => {
    addMarker(dashboardUrl);

    initRedirectOnBack();

    const persistedPageshow = (): void => {
      const pageshow = new Event('pageshow');
      Object.defineProperty(pageshow, 'persisted', { value: true });
      window.dispatchEvent(pageshow);
    };
    persistedPageshow();
    persistedPageshow();

    redirectToMock.mockClear();
    window.dispatchEvent(new PopStateEvent('popstate'));

    // A single Back must redirect exactly once — no accumulated listeners.
    expect(redirectToMock).toHaveBeenCalledTimes(1);
  });

  it('re-arms when the page is restored from the back/forward cache', () => {
    addMarker(dashboardUrl);

    initRedirectOnBack();
    expect(pushStateSpy).toHaveBeenCalledTimes(1);

    const pageshow = new Event('pageshow');
    Object.defineProperty(pageshow, 'persisted', { value: true });
    window.dispatchEvent(pageshow);

    expect(pushStateSpy).toHaveBeenCalledTimes(2);
  });

  it('does not re-arm on a normal (non-persisted) pageshow', () => {
    addMarker(dashboardUrl);

    initRedirectOnBack();
    expect(pushStateSpy).toHaveBeenCalledTimes(1);

    window.dispatchEvent(new Event('pageshow'));

    expect(pushStateSpy).toHaveBeenCalledTimes(1);
  });
});
