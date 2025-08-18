import config from 'config';

import {
  getDashboardNotifications,
  getDashboardTaskGroups,
  getRootGreeting,
} from '../../../../main/services/pcsApi/pcsApiService';

jest.mock('config', () => ({
  get: jest.fn(),
}));

jest.mock('../../../../main/modules/http', () => ({
  http: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    setToken: jest.fn(),
    setTokenRegenerator: jest.fn(),
  },
}));

jest.mock('node:fs/promises', () => ({
  readFile: jest.fn(),
}));

jest.mock('path', () => ({
  join: jest.fn(),
}));

const testApiBase = 'http://mock-api';
const mockHttp = require('../../../../main/modules/http').http;

describe('pcsApiService', () => {
  beforeEach(() => {
    (config.get as jest.Mock).mockReturnValue(testApiBase);
    jest.clearAllMocks();
  });

  test('should fetch root greeting', async () => {
    const expectedGreeting = 'test greeting';
    mockHttp.get.mockResolvedValue({ data: expectedGreeting });

    const actualGreeting = await getRootGreeting();
    expect(actualGreeting).toEqual(expectedGreeting);
    expect(mockHttp.get).toHaveBeenCalledWith(testApiBase);
  });

  test('should fetch dashboard notifications by case reference', async () => {
    const expectedNotifications = [
      {
        templateId: 'template-1',
        templateValues: { foo: 'bar', count: 2 },
      },
      {
        templateId: 'template-2',
        templateValues: { baz: 'qux' },
      },
    ];

    mockHttp.get.mockResolvedValue({ data: expectedNotifications });

    const caseReference = 123456;

    const actualNotifications = await getDashboardNotifications(caseReference);
    expect(actualNotifications).toEqual(expectedNotifications);
    expect(mockHttp.get).toHaveBeenCalledWith(`${testApiBase}/dashboard/${caseReference}/notifications`);
  });

  test('should fetch dashboard task groups by case reference', async () => {
    const expectedTaskGroups = [
      {
        groupId: 'CLAIM',
        tasks: [
          {
            templateId: 'task-1',
            templateValues: { foo: 'bar' },
            status: 'NOT_AVAILABLE',
          },
        ],
      },
    ];

    mockHttp.get.mockResolvedValue({ data: expectedTaskGroups });

    const caseReference = 123456;
    const actualTaskGroups = await getDashboardTaskGroups(caseReference);

    expect(actualTaskGroups).toEqual(expectedTaskGroups);
    expect(mockHttp.get).toHaveBeenCalledWith(`${testApiBase}/dashboard/${caseReference}/tasks`);
  });

  test('should handle error when fetching root greeting', async () => {
    const error = new Error('Network error');
    mockHttp.get.mockRejectedValue(error);

    await expect(getRootGreeting()).rejects.toThrow('Network error');
    expect(mockHttp.get).toHaveBeenCalledWith(testApiBase);
  });

  test('should handle error when fetching dashboard notifications', async () => {
    const error = new Error('Case not found');
    mockHttp.get.mockRejectedValue(error);

    const caseReference = 999999;
    await expect(getDashboardNotifications(caseReference)).rejects.toThrow('Case not found');
    expect(mockHttp.get).toHaveBeenCalledWith(`${testApiBase}/dashboard/${caseReference}/notifications`);
  });

  test('should handle error when fetching dashboard task groups', async () => {
    const error = new Error('Case not found');
    mockHttp.get.mockRejectedValue(error);

    const caseReference = 999999;
    await expect(getDashboardTaskGroups(caseReference)).rejects.toThrow('Case not found');
    expect(mockHttp.get).toHaveBeenCalledWith(`${testApiBase}/dashboard/${caseReference}/tasks`);
  });
});
