/**
 * @jest-environment jest-environment-jsdom
 */

import { initSessionTimeout } from '../../../../main/assets/js/session-timeout';

// On its own: initSessionTimeout's listeners stay on the document, so tests sharing it would renew too.
it('renews the server session while the user is active, until the warning is shown', () => {
  jest.useFakeTimers();
  const now = jest.spyOn(Date, 'now').mockReturnValue(0);
  const fetch = jest.fn().mockResolvedValue({ ok: true });
  global.fetch = fetch;
  document.body.innerHTML = `
    <div id="timeout-modal-container" hidden>
      <div id="timeout-modal" tabindex="-1"><span id="countdown-time"></span><span id="countdown-message"></span></div>
    </div>`;
  Object.assign(document.body.dataset, { sessionTimeout: '60', sessionWarning: '10', sessionCheckInterval: '10' });
  const modalContainer = document.getElementById('timeout-modal-container') as HTMLDivElement;

  initSessionTimeout();

  // Typing every minute for 61 minutes, longer than the session lasts.
  for (let minute = 1; minute <= 61; minute++) {
    now.mockReturnValue(minute * 60_000);
    document.dispatchEvent(new Event('keydown'));
    jest.advanceTimersByTime(60_000);
  }
  // Renewed every 25 minutes (half the 50 before the warning), with no warning shown.
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(fetch).toHaveBeenCalledWith('/active');
  expect(modalContainer.hasAttribute('hidden')).toBe(true);

  // Once idle long enough for the warning, only its button renews the session.
  now.mockReturnValue(120 * 60_000);
  jest.advanceTimersByTime(10_000);
  expect(modalContainer.hasAttribute('hidden')).toBe(false);
  document.dispatchEvent(new Event('keydown'));
  expect(fetch).toHaveBeenCalledTimes(2);

  jest.useRealTimers();
});
