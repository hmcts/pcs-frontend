import { Response } from 'express';

import { AppRequest } from '../../../app/controller/AppRequest';
import { CASE_SEARCH_URL, SIGN_IN_URL } from '../../../steps/urls';

import content from './content.json';

export class LandingGetController {
  public get(req: AppRequest, res: Response): void {
    if (req.session.hasOwnProperty('user')) {
      res.redirect(CASE_SEARCH_URL);
    } else {
      const Translations = content.translations;

      const en = Translations.en;
      const cy = Translations.cy;

      let SystemContent = en;
      let ToggleLanguage = 'cy';

      if (req.query.hasOwnProperty('lang')) {
        if (req.query['lang'] === 'en') {
          SystemContent = en;
          ToggleLanguage = 'cy';
        } else if (req.query['lang'] === 'cy') {
          SystemContent = cy;
          ToggleLanguage = 'en';
        } else {
          SystemContent = en;
          ToggleLanguage = 'cy';
        }
      }

      const loginURL = SIGN_IN_URL;
      res.render('landing.njk', { loginURL, content: SystemContent, ToggleLanguage });
    }
  }
}
