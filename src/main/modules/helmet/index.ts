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
      // "script-src 'self' *.google-analytics.com 'sha256-+6WnXIl4mbFTCARd8N3COQmT3bJJmo32N8q8ZSQAIcU='".
      // seems to be related to webpack
      scriptSrc.push("'unsafe-eval'");
      scriptSrc.push("'unsafe-inline'");
    } else {
      scriptSrc.push("'sha256-+6WnXIl4mbFTCARd8N3COQmT3bJJmo32N8q8ZSQAIcU='");
    }

    const formAction = [self];

    const pcqDomain: string = config.get('pcq.url');
    if (pcqDomain) {
      formAction.push(pcqDomain);
    }

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
            formAction: [self, pcqDomain],
          },
        },
        referrerPolicy: { policy: 'origin' },
      })
    );
  }
}
