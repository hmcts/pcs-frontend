/**
 * @jest-environment jest-environment-jsdom
 */

import { initSessionTimeout } from '../../../../main/assets/js/session-timeout';

describe('initSessionTimeout', () => {
  let mockDateNow: jest.SpyInstance;
  let mockFetch: jest.Mock;

  beforeEach(() => {
    document.body.innerHTML = '';
    jest.clearAllMocks();
    jest.useFakeTimers();

    // mock date.now
    mockDateNow = jest.spyOn(Date, 'now').mockReturnValue(0);

    // mock fetch
    mockFetch = jest.fn().mockResolvedValue({ ok: true });
    global.fetch = mockFetch;
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  const buildSessionTimeoutComponent = () => `
    <div id="timeout-modal-container" hidden>
      <div id="timeout-modal" tabindex="-1">
        <p>Your session will expire in <span id="countdown-timer"></span></p>
        <button id="timeout-modal-close-button">Continue</button>
      </div>
    </div>
  `;

  it('initializes without throwing errors', () => {
    document.body.innerHTML = buildSessionTimeoutComponent();
    document.body.dataset.sessionTimeout = '6';
    document.body.dataset.sessionWarning = '5';

    expect(() => initSessionTimeout()).not.toThrow();
  });

  it('handles missing modal elements', () => {
    document.body.innerHTML = '<div></div>';
    document.body.dataset.sessionTimeout = '6';
    document.body.dataset.sessionWarning = '5';

    expect(() => initSessionTimeout()).not.toThrow();
  });

  it('shows modal after inactivity time', () => {
    document.body.innerHTML = buildSessionTimeoutComponent();
    document.body.dataset.sessionTimeout = '6';
    document.body.dataset.sessionWarning = '5';

    const modalContainer = document.getElementById('timeout-modal-container') as HTMLDivElement;
    const modal = document.getElementById('timeout-modal') as HTMLDivElement;
    const focusSpy = jest.spyOn(modal, 'focus');

    initSessionTimeout();

    // model hidden
    expect(modalContainer.hasAttribute('hidden')).toBe(true);

    mockDateNow.mockReturnValue(60000);
    jest.advanceTimersByTime(10000);

    // modal visible
    expect(modalContainer.hasAttribute('hidden')).toBe(false);
    expect(focusSpy).toHaveBeenCalled();
  });

  it('resets activity timer on user interactions', () => {
    document.body.innerHTML = buildSessionTimeoutComponent();
    document.body.dataset.sessionTimeout = '6';
    document.body.dataset.sessionWarning = '5';

    const modalContainer = document.getElementById('timeout-modal-container') as HTMLDivElement;

    initSessionTimeout();

    // 30 seconds inactivity
    mockDateNow.mockReturnValue(30000);
    jest.advanceTimersByTime(10000);

    // modal hidden
    expect(modalContainer.hasAttribute('hidden')).toBe(true);

    // reset timer on click
    mockDateNow.mockReturnValue(30000);
    document.dispatchEvent(new Event('click'));

    mockDateNow.mockReturnValue(60000);
    jest.advanceTimersByTime(10000);

    // modal hidden - activity reset timer
    expect(modalContainer.hasAttribute('hidden')).toBe(true);
  });

  it('does not reset timer when modal is already shown', () => {
    document.body.innerHTML = buildSessionTimeoutComponent();
    document.body.dataset.sessionTimeout = '6';
    document.body.dataset.sessionWarning = '5';

    const modalContainer = document.getElementById('timeout-modal-container') as HTMLDivElement;

    initSessionTimeout();

    // show modal
    mockDateNow.mockReturnValue(60000);
    jest.advanceTimersByTime(10000);

    expect(modalContainer.hasAttribute('hidden')).toBe(false);

    // activity events when modal is shown
    document.dispatchEvent(new Event('click'));
    document.dispatchEvent(new Event('mousemove'));

    // no reset on timer - modal still shown
    expect(modalContainer.hasAttribute('hidden')).toBe(false);
  });

  it('updates countdown timer with time remaining', () => {
    document.body.innerHTML = buildSessionTimeoutComponent();
    document.body.dataset.sessionTimeout = '6';
    document.body.dataset.sessionWarning = '5';

    const countdownElement = document.getElementById('countdown-timer') as HTMLSpanElement;

    initSessionTimeout();

    // show modal
    mockDateNow.mockReturnValue(60000);
    jest.advanceTimersByTime(10000);

    // countdown should have minutes
    expect(countdownElement.textContent).toBeTruthy();
    expect(countdownElement.textContent).toContain('minute');
  });

  it('calls /active endpoint when continue button is clicked', async () => {
    document.body.innerHTML = buildSessionTimeoutComponent();
    document.body.dataset.sessionTimeout = '6';
    document.body.dataset.sessionWarning = '5';

    const modalContainer = document.getElementById('timeout-modal-container') as HTMLDivElement;
    const continueButton = document.getElementById('timeout-modal-close-button') as HTMLButtonElement;

    initSessionTimeout();

    // show modal
    mockDateNow.mockReturnValue(60000);
    jest.advanceTimersByTime(10000);

    expect(modalContainer.hasAttribute('hidden')).toBe(false);

    continueButton.click();

    // call /active
    expect(mockFetch).toHaveBeenCalledWith('/active');

    await Promise.resolve();

    // modal hidden
    expect(modalContainer.hasAttribute('hidden')).toBe(true);
  });

  it('handles fetch errors when continuing session', async () => {
    document.body.innerHTML = buildSessionTimeoutComponent();
    document.body.dataset.sessionTimeout = '6';
    document.body.dataset.sessionWarning = '5';

    mockFetch.mockRejectedValue(new Error('Network error'));

    const modalContainer = document.getElementById('timeout-modal-container') as HTMLDivElement;
    const continueButton = document.getElementById('timeout-modal-close-button') as HTMLButtonElement;

    initSessionTimeout();

    // show modal
    mockDateNow.mockReturnValue(60000);
    jest.advanceTimersByTime(10000);

    expect(modalContainer.hasAttribute('hidden')).toBe(false);

    continueButton.click();

    // fetch will reject and the catch should hide modal
    await Promise.resolve().then(() => Promise.resolve());

    // modal hidden
    expect(modalContainer.hasAttribute('hidden')).toBe(true);
  });
});
