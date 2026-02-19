/**
 * Application Insights bootstrap - MUST be loaded via node --require BEFORE any other modules.
 * This ensures OpenTelemetry can instrument Winston before it's loaded, avoiding:
 * "Module winston has been loaded before @opentelemetry/instrumentation-winston"
 *
 * Uses .cjs and require() only - no imports that could pull in winston.
 *
 * IMPORTANT: properties-volume MUST run before config.get() - otherwise the first config.get()
 * freezes the config (node-config immutability), and properties-volume fails when trying to
 * merge secrets with "Configuration objects are immutable unless ALLOW_CONFIG_MUTATIONS is set".
 */
(function () {
  const isProduction = (process.env.NODE_ENV || 'development') === 'production';

  if (isProduction) {
    try {
      const config = require('config');
      // Load secrets from volume BEFORE any config.get() - which freezes the config.
      // Must run first so PropertiesVolume.enableFor can skip addTo (config would be frozen by then).
      require('@hmcts/properties-volume').addTo(config);
      process.__propertiesVolumeLoaded = true;
    } catch {
      // Volume may not exist in all environments; continue
    }
  }

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
    console.log('Application Insights setup completed');
  }
})();
