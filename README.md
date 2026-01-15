# pcs-frontend

## Getting Started

### Prerequisites

Running the application requires the following tools to be installed in your environment:

- [Node.js](https://nodejs.org/) v22.0.0 or later
- [yarn](https://yarnpkg.com/)
- [Docker](https://www.docker.com)

#### NVM

A better alternative to installing nodejs directly is to use a version manager like [nvm](https://github.com/nvm-sh/nvm)
then running the command

```
nvm use
```

will ensure you are running the same version of node as determined in the CICD pipelines (it autodetects the .nvmrc file within this repository).

You can take this a step further and integrate auto-detection directly into your [shell](https://github.com/nvm-sh/nvm?tab=readme-ov-file#calling-nvm-use-automatically-in-a-directory-with-a-nvmrc-file)

### Running the application

Get the secret value from the azure keyvault and create .env file with the secrets

Install dependencies by executing the following command:

```bash
yarn install
```

Docker:
make sure running the redis

```bash
docker run -d --name pcs-redis -p 6379:6379 redis
```

#### Development

Bundle:

```bash
yarn build
```

Run:

```bash
yarn start:dev
```

#### Production

Bundle:

```bash
yarn build:prod
```

Run:

```bash
yarn start
```

The applications's home page will be available at http://localhost:3209

### Running with Docker

Create docker image:

```bash
docker-compose build
```

Run the application by executing the following command:

```bash
docker-compose up
```

This will start the frontend container exposing the application's port on `3209`, and a redis instance on port `6379`.

In order to test if the application is up, you can visit http://localhost:3209/ in your browser.
You should get a very basic home page (no styles, etc.).

## Developing

### Code style

We use [ESLint](https://github.com/typescript-eslint/typescript-eslint)
alongside [sass-lint](https://github.com/sasstools/sass-lint)

Running the linting with auto fix:

```bash
yarn lint:fix
```

### Running the tests

This template app uses [Jest](https://jestjs.io//) as the test engine. You can run unit tests by executing
the following command:

```bash
yarn test
```

### Creating IDAM users for tests

Use this command to create a temporary IDAM user:

```bash
yarn createIdamUser --roles=<ROLES> --email=<EMAIL> [--surname=<SURNAME>] [--forename=<FORENAME>]
```

where

- --roles: is a comma separated list of user roles without spaces
- --email: should not match any existing user's email ID
- [--surname]: is optional - defaults to 'Test' if not supplied
- [--forename]: is optional - defaults to 'User' if not supplied

For example, if you want to create an IDAM user with the email 'test@test.com', forename 'Dummy', Surname 'Casworker' and the roles 'citizen' and 'caseworker', use the following command:

```bash
yarn createIdamUser --roles=citizen,caseworker --email=testUser@test.com --surname=Caseworker --forename=Dummy
```

or with abbreviated param names and single role:

```bash
yarn createIdamUser -r=citizen -e=test2@test.com
```

Note: An auto-generated password will be output when the script runs.

The functional UI tests use [Playwright](https://playwright.dev/), and the pr suite can be run with the following command:

```bash
yarn test:functional
```

By default, the tests will run against http://localhost:3209/, please update the value on line 7 of src/test/config.ts to change this.

There are also several custom test scripts available:

- `yarn test:changed` - runs only changed spec files
- `test:E2eChrome` - runs the full E2E suite in Chrome
- `test:E2eFirefox` - runs the full E2E suite in Firefox
- `test:E2eSafari` - runs the full E2E suite in Safari

Running accessibility tests:

```bash
yarn test:accessibility
```

### Security

#### CSRF prevention

[Cross-Site Request Forgery](https://github.com/pillarjs/understanding-csrf) prevention has already been
set up in this template, at the application level. However, you need to make sure that CSRF token
is present in every HTML form that requires it. For that purpose you can use the `csrfProtection` macro,
included in this template app. Your njk file would look like this:

```
{% from "macros/csrf.njk" import csrfProtection %}
...
<form ...>
  ...
    {{ csrfProtection(csrfToken) }}
  ...
</form>
...
```

#### Helmet

This application uses [Helmet](https://helmetjs.github.io/), which adds various security-related HTTP headers
to the responses. Apart from default Helmet functions, following headers are set:

- [Referrer-Policy](https://helmetjs.github.io/docs/referrer-policy/)
- [Content-Security-Policy](https://helmetjs.github.io/docs/csp/)

There is a configuration section related with those headers, where you can specify:

- `referrerPolicy` - value of the `Referrer-Policy` header

Here's an example setup:

```json
    "security": {
      "referrerPolicy": "origin",
    }
```

Make sure you have those values set correctly for your application.

### Healthcheck endpoint

The application exposes a health endpoint (http://localhost:3209/health), created with the use of
[Nodejs Healthcheck](https://github.com/hmcts/nodejs-healthcheck) library. This endpoint is defined
in [health.ts](src/main/routes/health.ts) file and currently checks the following components:

- Redis
- pcs-api

### Info endpoint

The application also exposes an info endpoint (http://localhost:3209/info), created with the use of
[nodejs-info-provider](https://github.com/hmcts/nodejs-info-provider) library. This endpoint is defined
in [info.ts](src/main/routes/info.ts) file and currently displays info from:

- This service
- pcs-api

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details

### The following environment variables are needed to run the tests:

- NODE_CONFIG_ENV
- TEST_URL
- PCS_FRONTEND_IDAM_SECRET
- IDAM_SYSTEM_PASSWORD
- IDAM_SYSTEM_USERNAME
- IDAM_PCS_USER_PASSWORD
