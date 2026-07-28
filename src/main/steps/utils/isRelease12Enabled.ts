import type { Request } from 'express';

export function isRelease12Enabled(req: Request): boolean {
  return req.res?.locals?.release12Enabled === true;
}
