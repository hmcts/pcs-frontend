#!/usr/bin/env node
import { initializeTelemetry } from '@modules/opentelemetry';
import { PropertiesVolume } from '@modules/properties-volume';

const env = process.env.NODE_ENV || 'development';
const developmentMode = env === 'development';

async function start(): Promise<void> {
  new PropertiesVolume(developmentMode).enableFor();
  initializeTelemetry();
  await import('./server');
}

void start();
