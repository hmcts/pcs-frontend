import config from 'config';
import * as express from 'express';
import helmet from 'helmet';

const googleAnalyticsDomain = '*.google-analytics.com';
const self = "'self'";

/**
 * Module that enables helmet in the application
 */
export class Helmet {
  private readonly developmentMode: boolean;
  constructor(developmentMode: boolean) {
    this.developmentMode = developmentMode;
  }

  public enableFor(app: express.Express): void {
    // include default helmet functions
    const scriptSrc = [self, googleAnalyticsDomain];

    if (this.developmentMode) {
      // Uncaught EvalError: Refused to evaluate a string as JavaScript because 'unsafe-eval'
      // is not an allowed source of script in the following Content Security Policy directive:
      // "script-src 'self' *.google-analytics.com 'sha256-GUQ5ad8JK5KmEWmROf3LZd9ge94daqNvd8xy9YS1iDw='".
      // seems to be related to webpack
      scriptSrc.push("'unsafe-eval'");
      scriptSrc.push("'unsafe-inline'");
    } else {
      scriptSrc.push("'sha256-GUQ5ad8JK5KmEWmROf3LZd9ge94daqNvd8xy9YS1iDw='");
    }

    const formAction = [self];

    const pcqDomain: string = config.get('pcq.url');
    if (pcqDomain) {
      formAction.push(pcqDomain);
    }
    // this is required if user is submitting a form when they need to be logged in
    const idamDomain: string = new URL(config.get('oidc.issuer')).origin;
    if (idamDomain) {
      formAction.push(idamDomain);
    }

    formAction.push('http://localhost:3000');
    formAction.push('https://xui-pcs-api-pr-1085.preview.platform.hmcts.net/');

    app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            connectSrc: [self],
            defaultSrc: ["'none'"],
            fontSrc: [self, 'data:'],
            imgSrc: [self, googleAnalyticsDomain],
            objectSrc: [self],
            scriptSrc,
            styleSrc: [self],
            manifestSrc: [self],
            formAction,
          },
        },
        referrerPolicy: { policy: 'origin' },
      })
    );
  }
}
