#!/usr/bin/env node
import { initializeTelemetry } from '@modules/opentelemetry';
import { PropertiesVolume } from '@modules/properties-volume';

const env = process.env.NODE_ENV || 'development';
const developmentMode = env === 'development';

async function main(): Promise<void> {
  await new PropertiesVolume(developmentMode).enableFor();
  initializeTelemetry();
  await import('./server');
}

void main().catch(err => {
  // eslint-disable-next-line no-console
  console.error('Bootstrap failed:', err);
  process.exit(1);
});
