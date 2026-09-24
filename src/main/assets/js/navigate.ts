/**
 * Thin wrapper around browser navigation so it can be mocked in unit tests
 * (jsdom exposes `window.location` as read-only and non-configurable).

 */
export function redirectTo(url: string): void {
  window.location.assign(url);
}
