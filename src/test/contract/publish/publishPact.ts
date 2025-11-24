'use strict';

/* eslint no-console: 0 */

import { execFile } from 'child_process';
import path from 'path';

import git from 'git-rev-sync';

const PACT_DIRECTORY = process.env.PACT_DIRECTORY || 'pact/pacts';
const PACT_BROKER_URL = process.env.PACT_BROKER_URL || 'http://localhost:80';
const PACT_BRANCH_NAME = process.env.PACT_BRANCH_NAME || 'Dev';

const opts = {
  pactFilesOrDirs: [path.resolve(process.cwd(), PACT_DIRECTORY)],
  pactBroker: PACT_BROKER_URL,
  consumerVersion: git.short(),
  tags: [PACT_BRANCH_NAME ?: 'Dev'],
};

console.debug(`Publishing Pacts with options: ${JSON.stringify(opts, null, 2)}`);

const command = 'yarn';
const args = [
  'pact-broker',
  'publish',
  opts.pactFilesOrDirs[0],
  '--consumer-app-version',
  opts.consumerVersion,
  '--broker-base-url',
  opts.pactBroker,
  '--tag',
  opts.tags[0],
];

function publishPacts(): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile(command, args, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`Pact contract publishing failed: ${error.message}`));
      }
      if (stderr) {
        console.error(`stderr: ${stderr}`);
      }
      console.log(`stdout: ${stdout}`);
      console.log('Pact contract publishing complete!');
      resolve();
    });
  });
}

publishPacts()
  .then(() => {})
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
