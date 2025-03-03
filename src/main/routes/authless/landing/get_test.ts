import { mockRequest } from '../../../../test/unit/mocks/mockRequest';
import { mockResponse } from '../../../../test/unit/mocks/mockResponse';

import { LandingGetController } from './get';

describe('Test URL endpoints', () => {
  const controller = new LandingGetController();

  const res = mockResponse();
  const req = mockRequest();

  test('should redirect user to case finder page if already authenticated with IDAM', async () => {
    await controller.get(req, res);
    expect(res.redirect).toHaveBeenCalledWith(CASE_SEARCH_URL);
  });

  test('should redirect user to landing page if user not authenticated with IDAM', async () => {
    delete req.session.user;
    await controller.get(req, res);
    expect(res.render).toHaveBeenCalledWith('landing.njk', expect.any(Object));
  });

  test('should set ToggleLanguage to cy', async () => {
    delete req.session.user;
    req.query.lang = 'en';
    await controller.get(req, res);
    expect(res.render).toHaveBeenCalledWith('landing.njk', {
      loginURL: SIGN_IN_URL,
      content: expect.any(Object),
      ToggleLanguage: 'cy',
    });
  });

  test('should set ToggleLanguage to en', async () => {
    delete req.session.user;
    req.query.lang = 'cy';
    await controller.get(req, res);
    expect(res.render).toHaveBeenCalledWith('landing.njk', {
      loginURL: SIGN_IN_URL,
      content: expect.any(Object),
      ToggleLanguage: 'en',
    });
  });

  test('should set ToggleLanguage to default', async () => {
    delete req.session.user;
    req.query.lang = '';
    await controller.get(req, res);
    expect(res.render).toHaveBeenCalledWith('landing.njk', {
      loginURL: SIGN_IN_URL,
      content: expect.any(Object),
      ToggleLanguage: 'cy',
    });
  });
});
