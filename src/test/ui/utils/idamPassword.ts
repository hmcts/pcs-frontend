/** Prefer `IDAM_PCS_USER_PASSWORD_B64` on CI / Sauce when plain env is mangled (`$` in password). */
export function resolveIdamPassword(): string {
  const b64 = process.env.IDAM_PCS_USER_PASSWORD_B64?.trim();
  if (b64) {
    return Buffer.from(b64, 'base64').toString('utf8').trim();
  }
  return (process.env.IDAM_PCS_USER_PASSWORD ?? '').trim();
}
