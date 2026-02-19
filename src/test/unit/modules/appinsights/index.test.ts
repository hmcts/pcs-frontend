import config from 'config';

import { AppInsights } from '../../../../main/modules/appinsights';

jest.mock('applicationinsights', () => {
  const setup = jest.fn().mockReturnThis();
  const setSendLiveMetrics = jest.fn().mockReturnThis();
  const start = jest.fn();
  const defaultClient = {
    context: {
      tags: {},
      keys: {
        cloudRole: 'cloudRole',
      },
    },
  };
  return {
    setup,
    setSendLiveMetrics,
    start,
    defaultClient,
  };
});

describe('AppInsights test', () => {
  let appInsights: AppInsights;

  beforeEach(() => {
    jest.clearAllMocks();
    appInsights = new AppInsights(false);
  });

  it('should enable Application Insights when connection string is provided', () => {
    jest.spyOn(config, 'get').mockReturnValue('fake-connection-string');
    const appInsightsProdMode = new AppInsights(false);
    const appInsightsModule = require('applicationinsights');

    appInsightsProdMode.enableFor();

    expect(appInsightsModule.setup).toHaveBeenCalledWith('fake-connection-string');
    expect(appInsightsModule.setSendLiveMetrics).toHaveBeenCalledWith(true);
    expect(appInsightsModule.start).toHaveBeenCalled();
    expect(appInsightsModule.defaultClient.context.tags[appInsightsModule.defaultClient.context.keys.cloudRole]).toBe(
      'pcs-frontend'
    );
  });

  it('should not enable Application Insights when connection string is not provided', () => {
    jest.spyOn(config, 'get').mockReturnValue(null);

    appInsights.enableFor();

    const appInsightsModule = require('applicationinsights');
    expect(appInsightsModule.setup).not.toHaveBeenCalled();
    expect(appInsightsModule.start).not.toHaveBeenCalled();
  });

  it('should skip setup when already bootstrapped via --require', () => {
    (process as NodeJS.Process & { __appInsightsBootstrapped?: boolean }).__appInsightsBootstrapped = true;
    jest.spyOn(config, 'get').mockReturnValue('fake-connection-string');
    const appInsightsInstance = new AppInsights(false);
    const appInsightsModule = require('applicationinsights');

    appInsightsInstance.enableFor();

    expect(appInsightsModule.setup).not.toHaveBeenCalled();
    expect(appInsightsModule.start).not.toHaveBeenCalled();
    delete (process as NodeJS.Process & { __appInsightsBootstrapped?: boolean }).__appInsightsBootstrapped;
  });
});
