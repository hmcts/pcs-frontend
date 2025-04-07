<<<<<<< HEAD
import config from 'config';
<<<<<<< HEAD
=======

import { AppInsights } from '../../../../main/modules/appinsights';

<<<<<<< HEAD
>>>>>>> 227da3d (HDPI-359: fixing the unit test and build errors)

import { AppInsights } from '../../../../main/modules/appinsights';

=======
>>>>>>> 546a257 (HDPI-359: fixing the linting issue)
=======
import { AppInsights } from '../../../../main/modules/appinsights';

import config from 'config';

>>>>>>> da49f45 (Linting fixes)
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
    appInsights = new AppInsights();
  });

  it('should enable Application Insights when connection string is provided', () => {
    jest.spyOn(config, 'get').mockReturnValue('fake-connection-string');
    const appInsightsModule = require('applicationinsights');

    appInsights.enable();

    expect(appInsightsModule.setup).toHaveBeenCalledWith('fake-connection-string');
    expect(appInsightsModule.setSendLiveMetrics).toHaveBeenCalledWith(true);
    expect(appInsightsModule.start).toHaveBeenCalled();
    expect(appInsightsModule.defaultClient.context.tags[appInsightsModule.defaultClient.context.keys.cloudRole]).toBe(
      'pcs-frontend'
    );
  });

  it('should not enable Application Insights when connection string is not provided', () => {
    jest.spyOn(config, 'get').mockReturnValue(null);

    appInsights.enable();

    const appInsightsModule = require('applicationinsights');
    expect(appInsightsModule.setup).not.toHaveBeenCalled();
    expect(appInsightsModule.start).not.toHaveBeenCalled();
  });
});
