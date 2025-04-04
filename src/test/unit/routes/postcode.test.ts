import axios from 'axios';
import config from 'config';
import { Request, Response } from 'express';
import postcodeRoutes from '../../../main/routes/postcode';

jest.mock('axios');
jest.mock('config');

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedConfig = config as jest.Mocked<typeof config>;

describe('postcode routes', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let app: any;

  beforeEach(() => {
    req = { body: {} };
    res = { render: jest.fn() };
    app = {
      get: jest.fn(),
      post: jest.fn()
    };
    postcodeRoutes(app);
  });

  test('GET /postcode should render the postcode form', () => {
    expect(app.get).toHaveBeenCalledWith('/postcode', expect.any(Function));

    const handler = app.get.mock.calls[0][1];
    handler(req as Request, res as Response);

    expect(res.render).toHaveBeenCalledWith('postcode', { fields: {} });
  });

  test('POST /postcode with empty input should show validation error', async () => {
    req.body = { postcode: '' };

    const handler = app.post.mock.calls[0][1];
    await handler(req as Request, res as Response);

    expect(res.render).toHaveBeenCalledWith('postcode', {
      fields: {
        postcode: {
          value: '',
          errorMessage: 'Please enter a postcode',
        }
      }
    });
  });

  test('POST /postcode with valid input should call the API and render result', async () => {
    req.body = { postcode: 'SW1A 1AA' };
    const fakeData = { court: 'Westminster Court' };
    mockedAxios.get.mockResolvedValue({ data: fakeData });
    mockedConfig.get.mockReturnValue('http://mock-api');

    const handler = app.post.mock.calls[0][1];
    await handler(req as Request, res as Response);

    expect(mockedAxios.get).toHaveBeenCalledWith('http://mock-api/court?postCode=SW1A%201AA');
    expect(res.render).toHaveBeenCalledWith('postcode-result', { courtData: fakeData });
  });

  test('POST /postcode API failure should render error message', async () => {
    req.body = { postcode: 'SW1A 1AA' };
    mockedAxios.get.mockRejectedValue(new Error('API error'));
    mockedConfig.get.mockReturnValue('http://mock-api');

    const handler = app.post.mock.calls[0][1];
    await handler(req as Request, res as Response);

    expect(res.render).toHaveBeenCalledWith('postcode', {
      fields: {
        postcode: {
          value: 'SW1A 1AA',
          errorMessage: 'There was a problem retrieving court information.',
        }
      }
    });
  });
});
