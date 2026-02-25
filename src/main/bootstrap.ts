#!/usr/bin/env node
import { initializeTelemetry } from '@modules/opentelemetry';
import { PropertiesVolume } from '@modules/properties-volume';

const env = process.env.NODE_ENV || 'development';
const developmentMode = env === 'development';

new PropertiesVolume(developmentMode).enableFor();
initializeTelemetry();
void import('./server');
