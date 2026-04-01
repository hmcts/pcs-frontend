/**
 * Single place for test-user password: globalSetup, login, and createUser all use this.
 * Prefer `IDAM_PCS_USER_PASSWORD_B64` in CI/Sauce when plain `IDAM_PCS_USER_PASSWORD` is wrong (e.g. `$` stripped or mangled).
 */
export function resolveIdamPassword(): string {
  const b64 = process.env.IDAM_PCS_USER_PASSWORD_B64?.trim();
  if (b64) {
    return Buffer.from(b64, 'base64').toString('utf8').trim();
  }
  return (process.env.IDAM_PCS_USER_PASSWORD ?? '').trim();
}
