'use strict';

/* eslint no-console: 0 */

import path from 'path';

import pact from '@pact-foundation/pact-node';
import git from 'git-rev-sync';

const PACT_DIRECTORY = process.env.PACT_DIRECTORY || 'pact/pacts';
const PACT_BROKER_URL = process.env.PACT_BROKER_URL || 'http://localhost:80';
const PACT_BRANCH_NAME = process.env.PACT_BRANCH_NAME || 'Dev';

const opts = {
  pactFilesOrDirs: [path.resolve(process.cwd(), PACT_DIRECTORY)],
  pactBroker: PACT_BROKER_URL,
  consumerVersion: git.short(),
  tags: [PACT_BRANCH_NAME === 'master' ? 'master' : 'Dev'],
};

console.log(`Publishing Pacts with options: ${JSON.stringify(opts, null, 2)}`);

pact
  .publishPacts(opts)
  .then(() => {
    console.log('Pact contract publishing complete!');
  })
  .catch(e => {
    console.error('Pact contract publishing failed:', e);
    process.exit(1);
  });
