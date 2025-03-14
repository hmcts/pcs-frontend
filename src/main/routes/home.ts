import { Logger } from '@hmcts/nodejs-logging';
import axios, { AxiosResponse } from 'axios';
import config from 'config';
import { Application, Request, Response } from 'express';

const logger = Logger.getLogger('app');

export default function (app: Application): void {
  app.get('/', async (req: Request, res: Response) => {
    let apiResponse: Partial<AxiosResponse> = {
      data: 'default value',
    };

    try {
      apiResponse = await axios.get(config.get('api.url'));
    } catch (error) {
      logger.error(`pcs-api error: ${error.response?.statusText}`); // ✅ Use logger
    }

    res.render('home', { apiResponse: apiResponse.data });
  });
}
