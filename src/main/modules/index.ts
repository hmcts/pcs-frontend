export { http } from './http';
export { S2S } from './s2s';
export { AppInsights } from './appinsights';
export { Helmet } from './helmet';
export { Nunjucks } from './nunjucks';
export { OIDCModule } from './oidc';
export { PropertiesVolume } from './properties-volume';
export { Session } from './session';
export { LaunchDarkly } from './launch-darkly';
export { I18n } from './i18n';

// this is used to register the modules with the app in a certain order
export const modules = [
  'I18n',
  'PropertiesVolume',
  'AppInsights',
  'Nunjucks',
  'Helmet',
  'Session',
  'S2S',
  'OIDCModule',
  'LaunchDarkly',
];
