import axios, { AxiosResponse } from 'axios';
import config from 'config';
import { Application, Request, Response } from 'express';

import { oidcMiddleware } from '../middleware';

export default function (app: Application): void {
  app.get('/', oidcMiddleware, async (req: Request, res: Response) => {
    let apiResponse: Partial<AxiosResponse> = {
      data: 'default value',
    };
    try {
      apiResponse = await axios.get(config.get('api.url'));
    } catch (error) {
      // console.error('pcs-api error', error.response.statusText);
    }

    res.render('home', { apiResponse: apiResponse.data });
  });
}
