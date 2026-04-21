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

Runtime secrets are pulled live from the AAT key vault (`pcs-aat`) at startup
via [@hmcts/properties-volume](https://github.com/hmcts/properties-volume-nodejs),
so you no longer need to copy secret values into `.env` by hand. Authenticate
once with the Azure CLI:

```bash
az login
```

Any secrets declared in `charts/pcs-frontend/values.yaml` under
`nodejs.keyVaults.pcs.secrets` are fetched on boot. To opt out (e.g. offline
work, or if you don't have vault access), set `USE_VAULT=false` and populate
the secrets in `.env` yourself — see `.env.example` for the test-user
credentials that are still `.env`-only.

Install dependencies by executing the following command:

```bash
yarn install
```

If necessary, login to the hmctsprod ACR:

```bash
> az acr login -n hmctsprod
```

Redis and Wiremock run in a local Docker container; `yarn start:dev` now brings it up
automatically (via the `deps:up` script) on first run and reuses the
`pcs-redis` container on subsequent runs. If you prefer to manage it yourself:

```bash
> docker compose up -d
 ✔ Network pcs-frontend_default       Created                                                                                                                     0.0s
 ✔ Container pcs-frontend-cache-1     Started                                                                                                                     0.2s
 ✔ Container pcs-frontend-wiremock-1  Started
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

To run against a local PCS backend started from the pcs-api repository with:

```bash
./gradlew bootWithCCD
```

use the dedicated local script:

```bash
yarn start:dev:pcs-local
```

This points the frontend at the local services exposed by `pcs:bootWithCCD`:

#### Production

Bundle:

```bash
yarn build:prod
```

Run:

```bash
yarn start
```

The application's home page will be available at http://localhost:3209

### Running with Docker

#### Authenticate to HMCTS ACR

The Docker images used by this service (both the application base image and the Redis image) are now hosted in the
`hmctsprod` Azure Container Registry and require authentication.

Before running any Docker-based commands you must be logged in to `hmctsprod`:

```bash
az login            # if not already logged in
az acr login --name hmctsprod
```

You only need to do this once per Azure CLI session.

Create docker image:

```bash
yarn docker:login:hmctsprod
docker compose build
```

Run the application by executing the following command:

```bash
yarn docker:login:hmctsprod
docker compose up
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

UI tests use [Playwright](https://playwright.dev/).

- **`yarn test:functional`** — Chrome regression scope (see script / `E2E_TEST_SCOPE`). Point tests at your app with env (e.g. **`TEST_URL`** in `.env`).
- **`yarn test:E2e`** — Playwright reads **`E2E_TEST_SCOPE`** (title `grep`) and **`E2E_SPEC`** (optional path keywords → `testMatch` globs) from the environment. **`PLAYWRIGHT_PROJECT`** picks the browser (default `chrome`). With `CI=true`, extra projects exist: `firefox`, `webkit`, `edge`, `mobile-android`, `mobile-ios`, `mobile-ipad`. Jenkins nightly and PR pipelines set `E2E_*` for you; locally you can set the same vars or rely on config defaults in `playwright.config.ts`.
- **`yarn test:changed`** — changed specs only.

**Nightly (`Jenkinsfile_nightly`)** — `setFunctionalTestEnvVars()` copies job parameters onto `env` for Playwright:

| Jenkins parameter | Maps to | Behaviour |
|-------------------|---------|-----------|
| `PLAYWRIGHT_SPEC` | `E2E_SPEC` | Optional. Comma- or semicolon-separated **keywords**; each must appear **verbatim** in the path of a `*.spec.ts` under `src/test/ui` (see parameter description in the job). Blank = all specs. |
| `PLAYWRIGHT_GREP_TAG` | `E2E_TEST_SCOPE` | Fixed dropdown. Any choice except **`(all tests)`** is passed through as the title filter. **`(all tests)`** clears the tag filter (no `grep`). |
| `ENABLE_ALL_PAGE_FUNCTIONAL_TESTS`, `ENABLE_AXE_AUDIT` | same names | Passed through to Playwright / helpers. |
| Per-browser matrix | `PLAYWRIGHT_PROJECT` | Set only for each `yarn test:E2e` stage (`chrome`, `firefox`, …). |

**PR (`Jenkinsfile_CNP`)** — optional GitHub labels (first label matching each prefix wins). Values after the colon are trimmed and passed to `env` as below.

| Label | Effect |
|-------|--------|
| `e2e-tag:<value>` | Sets `E2E_TEST_SCOPE` to `<value>` for Playwright title `grep`, unless `<value>` is **`ALL`** or **`(all tests)`** (matched case-insensitively) → no tag filter. If **no** `e2e-tag:` label → `E2E_TEST_SCOPE` is **`@PR`**. |
| `e2e-spec:<keywords>` | Sets `E2E_SPEC` (same comma/semicolon keyword rules as nightly). |
| `enable_all_page_functional_tests` | Turns on the bundled page functional checks (same as before). |
| `enable_content_validation`, `enable_visibility_validation`, `enable_error_messages_validation`, `enable_navigation_tests` | Set the matching `ENABLE_*` env flags when present. |

If none of the E2E labels above are used, PR E2E uses **`@PR`** grep, no spec filter, and page functional flags stay **off** unless you add the granular `enable_*` labels. Axe is not set from PR Jenkins config; it follows **`playwright.config.ts`** (default on unless `ENABLE_AXE_AUDIT` is set elsewhere).

**Case sensitivity and matching**

- **Spec path keywords** (`PLAYWRIGHT_SPEC` / `e2e-spec:` → `E2E_SPEC`): **case-sensitive**. Each keyword must match the **exact** spelling and casing of the substring in the spec file path (e.g. `respondToAClaim` vs `respondtoaclaim` are not interchangeable). Separate multiple keywords with **comma** or **semicolon**.
- **Tag / title filter** (`PLAYWRIGHT_GREP_TAG` / `e2e-tag:` → `E2E_TEST_SCOPE`): passed into Playwright as a **regular expression** over test titles. Use the **exact** characters that appear in titles (e.g. **`@smoke`** not **`@Smoke`**). Nightly tags are fixed by the dropdown; on PR, anything you type after `e2e-tag:` is used as-is, except the two **“run all tests”** sentinels **`ALL`** and **`(all tests)`**, which are detected case-insensitively and mean “no tag grep”.

### Stubbing Wiremock for local development

Wiremock is used locally to stub responses from other services, (just the Fee Service
at the time of writing). To alter or extend the mappings, edit or add to the files
in [wiremock/mappings](wiremock/mappings).

Ensure that you have run the docker compose command referenced earlier to
get the wiremock container running locally.

See the [Wiremock documentation](https://wiremock.org/docs/stubbing/) for more details on how
to create mapping files.

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
- DATA_STORE_URL_BASE
- PCS_API_URL
- PCS_API_CHANGE_ID
