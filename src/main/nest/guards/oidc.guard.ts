import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

import { oidcMiddleware } from '../../middleware/oidc';

@Injectable()
export class OidcGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    return new Promise((resolve, reject) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      oidcMiddleware(request as any, response as any, (err?: unknown) => {
        if (err) {
          reject(new UnauthorizedException('Authentication required'));
        } else {
          resolve(true);
        }
      });
    });
  }
}
