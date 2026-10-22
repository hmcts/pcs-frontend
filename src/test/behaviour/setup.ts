import { clearImmediate, setImmediate } from 'node:timers';
import { TextDecoder, TextEncoder } from 'node:util';

// jsdom does not provide these. ProseMirror needs the encoders; express and node http need
// setImmediate because the application runs in the same process as the page.
Object.assign(globalThis, { TextDecoder, TextEncoder, setImmediate, clearImmediate });

process.env.LOG_LEVEL ??= 'error';

// jest.behaviour.config.js's testTimeout is not honoured when this project runs
// combined with another via `jest --projects ... --coverage` (test:coverage does
// this); Jest silently falls back to its 5000ms default in that combination.
// Setting it here, inside the actual test run, is not affected by that.
jest.setTimeout(30000);

// The application's outbound calls run in the page's jsdom process. Without this axios picks
// jsdom's XMLHttpRequest and its CORS rules; the server should talk to CCD as Node does.

require('axios').defaults.adapter = 'http';
