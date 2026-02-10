import config from 'config';

import type { OIDCConfig } from './oidc/config.interface';

export { http } from './http';
export { S2S } from './s2s';
export { AppInsights } from './appinsights';
export { Helmet } from './helmet';
export { Nunjucks } from './nunjucks';
export { PropertiesVolume } from './properties-volume';
export { Session } from './session';
export { Journey } from './journey';
export { LaunchDarkly } from './launch-darkly';
export { I18n } from './i18n';

/**
 * OIDC Module Selection
 *
 * Dynamically loads the appropriate OIDC implementation based on OIDC_ISSUER.
 * This allows developers to work locally without VPN by using the IDAM simulator.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ DEVELOPMENT OPTIONS (running on local laptop)                           │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ Option 1: Local IDAM Simulator (No VPN)                                 │
 * │   OIDC_ISSUER: http://localhost:5062/o                                  │
 * │   Module: oidc-local.ts (Password Grant)                                │
 * │   Login: HTML form on app                                               │
 * │   VPN: ❌ Not required                                                   │
 * │   Use: Quick local development                                          │
 * │                                                                          │
 * │ Option 2: AAT IDAM (VPN Required)                                       │
 * │   OIDC_ISSUER: https://idam-web-public.aat.platform.hmcts.net/o         │
 * │   Module: oidc.ts (OAuth Authorization Code + PKCE)                     │
 * │   Login: Redirects to AAT IDAM website                                  │
 * │   VPN: ✅ Required (AAT is internal network)                             │
 * │   Use: Test with real AAT data/users                                    │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ DEPLOYED ENVIRONMENTS (running on servers)                              │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ AAT Deployment (Staging)                                                │
 * │   OIDC_ISSUER: https://idam-web-public.aat.platform.hmcts.net/o         │
 * │   Module: oidc.ts (OAuth)                                               │
 * │   VPN: ❌ Not needed (server is in AAT network)                          │
 * │                                                                          │
 * │ Production Deployment (Public Facing)                                   │
 * │   OIDC_ISSUER: https://idam-web-public.platform.hmcts.net/o             │
 * │   Module: oidc.ts (OAuth)                                               │
 * │   VPN: ❌ Not needed (public internet)                                   │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * To switch local development modes:
 *   1. Edit .env file
 *   2. Change OIDC_ISSUER value
 *   3. Restart server (yarn start:dev)
 *
 * Security Note: oidc-local.ts ships to production but is only loaded when
 * OIDC_ISSUER contains "localhost". Production uses immutable env vars set
 * in deployment manifests, making accidental local mode activation impossible.
 */
const oidcConfig = config.get<OIDCConfig>('oidc');
const useLocalIdam = oidcConfig.issuer.includes('localhost');

const OIDCModule = useLocalIdam ? require('./oidc/oidc-local').OIDCLocalModule : require('./oidc/oidc').OIDCModule;

export { OIDCModule };

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
