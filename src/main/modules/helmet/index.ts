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
    // property intentionally retained for compatibility; mark as used to satisfy TS
    void this.developmentMode;

    // include default helmet functions
    const scriptSrc = [self, googleAnalyticsDomain];
    const styleSrc = [self];

    // For demo we allow inline and eval regardless of env to keep header shell scripts working.
    scriptSrc.push("'unsafe-eval'");
    scriptSrc.push("'unsafe-inline'");

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

    app.use(
      helmet({
        // ACI demo runs over plain HTTP; disable HSTS and upgrade-insecure-requests to avoid forced HTTPS.
        hsts: false,
        contentSecurityPolicy: {
          useDefaults: false,
          directives: {
            connectSrc: [self],
            defaultSrc: ["'none'"],
            fontSrc: [self, 'data:'],
            imgSrc: [self, googleAnalyticsDomain],
            objectSrc: [self],
            scriptSrc,
            styleSrc,
            manifestSrc: [self],
            formAction,
            upgradeInsecureRequests: null,
          },
        },
        referrerPolicy: { policy: 'origin' },
      })
    );
  }
}
