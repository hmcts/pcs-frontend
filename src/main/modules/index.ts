import config from 'config';

import type { OIDCConfig } from './oidc/config.interface';
import { OIDCModule as OIDCProductionModule } from './oidc/oidc';
import { OIDCLocalModule } from './oidc/oidc-local';

export { http } from './http';
export { S2S } from './s2s';
export { Helmet } from './helmet';
export { Nunjucks } from './nunjucks';
export { Session } from './session';
export { LaunchDarkly } from './launch-darkly';
export { I18n } from './i18n';
export { Logger } from './logger';

// Dynamic OIDC module selection based on issuer URL
const oidcConfig: OIDCConfig = config.get<OIDCConfig>('oidc');
const isLocalDevelopment = oidcConfig.issuer.includes('localhost');

// Export the appropriate OIDC module based on environment
export const OIDCModule = isLocalDevelopment ? OIDCLocalModule : OIDCProductionModule;

// this is used to register the modules with the app in a certain order
export const modules = ['I18n', 'Nunjucks', 'Helmet', 'Session', 'S2S', 'OIDCModule', 'LaunchDarkly'];
