import { expect, test } from '@playwright/test';

import { loginWithIdam } from '../utils/login';

const origin = 'https://idam.example.test';
const email = 'citizen@example.test';
const password = 'test-password';

for (const journey of [
  'legacy',
  'legacy-with-registration',
  'access',
  'access-with-landing',
  'access-password-only',
  'access-submit-fallback',
] as const) {
  test(`signs in through ${journey} and returns to the service`, async ({ page }) => {
    await page.route(`${origin}/**`, async route => {
      const request = route.request();
      const pathname = new URL(request.url()).pathname;
      const form = new URLSearchParams(request.postData() ?? '');

      if (pathname === '/login' && journey === 'access-with-landing') {
        await route.fulfill({
          contentType: 'text/html',
          body: '<h1>Sign in or create an account</h1><a href="/email" role="button">Sign in</a>',
        });
      } else if (pathname === '/login' && (journey === 'legacy' || journey === 'legacy-with-registration')) {
        await route.fulfill({
          contentType: 'text/html',
          body: `<h1>${journey === 'legacy-with-registration' ? 'Sign in or create an account' : 'Sign in'}</h1>
            <form action="/callback" method="post">
            <label>Email address<input name="username" type="text"></label>
            <label>Password<input name="password" type="password"></label>
            <button>Sign in</button></form>`,
        });
      } else if (pathname === '/login' && journey === 'access-password-only') {
        await route.fulfill({
          contentType: 'text/html',
          body: `<h1>Enter your password</h1><form action="/callback" method="post">
            <input name="email" value="${email}" hidden>
            <label>Enter your password<input name="password" type="password"></label>
            <button>Continue</button></form>`,
        });
      } else if (pathname === '/login' || pathname === '/email') {
        await route.fulfill({
          contentType: 'text/html',
          body: `<h1>Enter your email address</h1><form action="/password" method="post">
            <label>Enter your email address<input name="email" type="email"></label>
            ${journey === 'access-submit-fallback' ? '<input type="submit" value="Next">' : '<button>Continue</button>'}</form>`,
        });
      } else if (pathname === '/password') {
        expect(form.get('email')).toBe(email);
        // The password page carries the email forward in a hidden input.
        await route.fulfill({
          contentType: 'text/html',
          body: `<h1>Enter your password</h1><form action="/callback" method="post">
            <input name="email" type="email" value="${email}" hidden>
            <label>Enter your password<input name="password" type="password"></label>
            <button type="button">Show</button>
            ${journey === 'access-submit-fallback' ? '<button type="submit">Next</button>' : '<button>Continue</button>'}</form>`,
        });
      } else if (pathname === '/callback') {
        expect(form.get('email') ?? form.get('username')).toBe(email);
        expect(form.get('password')).toBe(password);
        await route.fulfill({ contentType: 'text/html', body: '<h1>Your claims</h1>' });
      } else {
        await route.abort();
      }
    });

    await page.goto(`${origin}/login`);
    await loginWithIdam(page, email, password);

    await expect(page).toHaveURL(`${origin}/callback`);
    await expect(page.getByRole('heading', { name: 'Your claims' })).toBeVisible();
  });
}

test('reports an unexpected login page instead of guessing a journey', async ({ page }) => {
  await page.setContent('<h1>Service unavailable</h1>');

  await expect(loginWithIdam(page, email, password)).rejects.toThrow(
    'Unexpected login page heading: "Service unavailable"'
  );
});
