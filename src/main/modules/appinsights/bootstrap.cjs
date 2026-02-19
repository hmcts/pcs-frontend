/**
 * Application Insights bootstrap - MUST be loaded via node --require BEFORE any other modules.
 * This ensures OpenTelemetry can instrument Winston before it's loaded, avoiding:
 * "Module winston has been loaded before @opentelemetry/instrumentation-winston"
 *
 * Uses .cjs and require() only - no imports that could pull in winston.
 */
(function () {
  const connectionString =
    process.env.APPLICATION_INSIGHTS_CONNECTION_STRING ||
    (() => {
      try {
        const config = require('config');
        return config.get('secrets.pcs.app-insights-connection-string');
      } catch {
        return null;
      }
    })();

  const developmentMode = (process.env.NODE_ENV || 'development') === 'development';
  const isValidConnectionString =
    connectionString && connectionString !== 'AAAAAAAAAAAAAAAA' && connectionString.startsWith('InstrumentationKey=');

  if (isValidConnectionString && !developmentMode) {
    const appInsights = require('applicationinsights');
    console.log('Setting up Application Insights', { connectionString });
    appInsights.setup(connectionString).setSendLiveMetrics(true);
    appInsights.defaultClient.context.tags[appInsights.defaultClient.context.keys.cloudRole] = 'pcs-frontend';
    appInsights.start();
    process.__appInsightsBootstrapped = true;
    console.log('Application Insights setup complete');
  }
})();
