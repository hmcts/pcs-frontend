import { Request, Response } from 'express';

import { GetController } from '../../../../main/app/controller/GetController';
import {
  createGetController,
  createPostRedirectController,
  validateAndStoreForm,
} from '../../../../main/app/controller/controllerFactory';
import type { FormFieldConfig } from '../../../../main/interfaces/formFieldConfig.interface';

jest.mock('../../../../main/app/controller/GetController');

describe('controllerFactory', () => {
  describe('createGetController', () => {
    it('should create a GetController with expected view path and content', () => {
      const mockContent = { title: 'Test Page', serviceName: 'Test Service' };
      const controller = createGetController('steps/page1.njk', 'page1', mockContent);

      expect(controller).toBeInstanceOf(GetController);
    });
  });

  describe('createPostRedirectController', () => {
    it('should redirect to the next URL', () => {
      const nextUrl = '/next-page';
      const controller = createPostRedirectController(nextUrl);

      const req = {} as Request;
      const res = { redirect: jest.fn() } as unknown as Response;

      controller.post(req, res);
      expect(res.redirect).toHaveBeenCalledWith(nextUrl);
    });
  });

  describe('validateAndStoreForm', () => {
    it('should validate, store form data, and redirect', () => {
      const stepName = 'page1';
      const fields: FormFieldConfig[] = [{ name: 'answer', type: 'radio', required: true }];
      const nextPage = '/steps/page2';
      const req = {
        body: { answer: 'Yes' },
        session: { formData: {} },
      } as unknown as Request;
      const res = { redirect: jest.fn(), status: jest.fn().mockReturnThis(), render: jest.fn() } as unknown as Response;

      const controller = validateAndStoreForm(stepName, fields, nextPage);
      controller.post(req, res);

      expect(res.redirect).toHaveBeenCalledWith(nextPage);
    });

    it('should return error and re-render template if validation fails', () => {
      const stepName = 'page1';
      const fields: FormFieldConfig[] = [{ name: 'answer', type: 'radio', required: true }];
      const nextPage = '/steps/page2';
      const req = {
        body: { answer: '' },
        session: { formData: {} },
      } as unknown as Request;
      const res = { status: jest.fn().mockReturnThis(), render: jest.fn() } as unknown as Response;

      const controller = validateAndStoreForm(stepName, fields, nextPage);
      controller.post(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.render).toHaveBeenCalledWith(
        'steps/page1.njk',
        expect.objectContaining({
          error: 'This field is required',
        })
      );
    });
  });
});
