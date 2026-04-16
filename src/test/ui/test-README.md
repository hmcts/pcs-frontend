# Test Automation Framework Documentation

## 1. Framework Overview

A structured, maintainable test automation solution built on Playwright that:

- Implements Pattern-matching
- Separates test logic from implementation details
- Provides ready-to-use components for UI interactions and validations

## 1.1 Folder Structure

```
ui/
├── config/                    # Configuration files
│   ├── global-setup.config.ts  # Global test setup configuration
│   └── global-teardown.config.ts # Global teardown configuration
├── data/                      # Test data files
├── functional/                # Test/spec files
├── utils/                     # Core framework utilities
│   ├── actions/               # Action implementations
│   │   ├── custom-actions/    # Application-specific actions
│   │   └── element-actions/   # Generic element interactions
│   ├── validations/           # Validation implementations
│   │   ├── custom-validations/ # Application-specific validations
│   │   └── element-validations/ # Generic element validations
│   ├── interfaces/            # Type definitions
│   │   ├── action.interface.ts # Action interface
│   │   └── validation.interface.ts # Validation interface
│   ├── registry/              # Component registration
│   │   ├── action.registry.ts # Action registry
│   │   └── validation.registry.ts # Validation registry
│   └── controller.ts          # Controls the usage of actions and validations
├── testREADME.md              # Framework documentation
└── update-testReadMe.ts       # Documentation auto-update script
```

_Note: The `update-testReadMe.ts` script automatically updates this documentation file with available actions/validations through the global teardown hook that runs in local development environments._

## 2. Core Architecture

The framework's modular design consists of these key layers:

| Layer                   | Folder/File                              | Description                                                      |
| ----------------------- | ---------------------------------------- | ---------------------------------------------------------------- |
| **Configuration**       | `config/`                                | Manages environment setup and test lifecycle hooks               |
| **Test Data**           | `data/`                                  | Stores test data files for data-driven testing                   |
| **Test Specs**          | `functional/`                            | Contains feature-organized test specifications                   |
| **Controller**          | `utils/controller.ts`                    | Orchestrates test execution through action/validation interfaces |
| **Element Actions**     | `utils/actions/element-actions/`         | Implements core browser interactions (clicks, fills, etc.)       |
| **Custom Actions**      | `utils/actions/custom-actions/`          | Handles domain-specific workflows (login, navigation)            |
| **Element Validations** | `utils/validations/element-validations/` | Verifies basic element states (visibility, text, etc.)           |
| **Custom Validations**  | `utils/validations/custom-validations/`  | Validates business rules and complex scenarios                   |
| **Interfaces**          | `utils/interfaces/`                      | Defines implementation contracts for actions and validations     |
| **Registry**            | `utils/registry/`                        | Maintains component registration and lookup system               |
| **Documentation**       | `testREADME.md` + `update-testReadMe.ts` | Auto-updating framework documentation system                     |

## 3. Getting Started

### Prerequisites

```bash
Playwright 1.30+ | TypeScript 4.9+
```

## 4. Actions and Validations

### Actions are listed in `src/test/ui/utils/registry/action.registry.ts`

### Validations are listed in `src/test/ui/utils/registry/validation.registry.ts`

### Basic Test

```typescript
initializeExecutor(page);
await performAction('clickButton', 'LoginButton');
await performValidation('text', 'WelcomeMsg', 'Welcome!');
```

### Test Groups

```typescript
await performActionGroup(
  'Login',
  { action: 'inputText', fieldName: 'Email', value: 'test@example.com' },
  { action: 'clickButton', fieldName: 'Submit' }
);

await performValidationGroup(
  'Post-Login',
  { validationType: 'url', data: { expected: '/dashboard' } },
  { validationType: 'visible', fieldName: 'UserMenu' }
);
```

## 6. Extending the Framework

### Adding Actions

1. Create `new-action.action.ts`:
   ```typescript
   export class NewAction implements IAction {
     execute(page: Page, fieldName: string) {
       /* ... */
     }
   }
   ```
2. Register in `action.registry.ts`:
   ```typescript
   ActionRegistry.register('newAction', new NewAction());
   ```

### Adding Validations

1. Create `new-validation.validation.ts`:
   ```typescript
   export class NewValidation implements IValidation {
     validate(page: Page, data: any) {
       /* ... */
     }
   }
   ```
2. Register in `validation.registry.ts`:
   ```typescript
   ValidationRegistry.register('newValidation', new NewValidation());
   ```

## 7. Execution

### The following environment variables are needed to run the tests:

- NODE_CONFIG_ENV
- TEST_URL
- PCS_FRONTEND_IDAM_SECRET
- IDAM_SYSTEM_PASSWORD
- IDAM_SYSTEM_USERNAME
- IDAM_PCS_USER_PASSWORD
- CHANGE_ID
- PCS_API_CHANGE_ID
- DATA_STORE_URL_BASE

**Playwright grep and file scope (CI or local):**

- **`FUNCTIONAL_TEST_SCOPE`** — Playwright `grep` in `playwright.config.ts` (test titles). **Empty** = no grep. **`yarn test:E2e`** uses `FUNCTIONAL_TEST_SCOPE` default `@nightly` when unset (`PLAYWRIGHT_PROJECT` required). **`yarn test:functional`** defaults to `@regression` via CLI if unset. PR builds default `@PR` unless labels override (below).
- **`E2E_SPEC`** — Optional filename keyword(s) under `src/test/ui`. Each becomes `**/*<keyword>*.spec.ts` (multiple keywords are **OR**). Use **comma or semicolon** to list several, e.g. `respondToAClaim,makeAnApplication`. **Empty** = all specs. Keywords that match no file are skipped (with a warning); if none match, all specs are used.

```bash
yarn test:functional
```

### PFT test-env debug logging

In [`playwright.config.ts`](../../../playwright.config.ts), `enable_pft_debug_log` is **`false` by default**. Set it to **`true`** if you want environment variables to be printed in the console while you debug.

```ts
export const enable_pft_debug_log = false;
```

## 8. Troubleshooting

| Issue                  | Solution                                    |
| ---------------------- | ------------------------------------------- |
| "Action not found"     | Check registration                          |
| "Validation not found" | Check registration                          |
| Locator failures       | Verify fieldName matches UI text/attributes |
| Timeout errors         | Add explicit waits in components            |

## 9. Content Auto-Validation

How It Works -
Automatic: Triggers after click actions that cause page navigation

Data-Driven: Uses page data files in data/page-data

Smart Mapping: Automatically maps URLs to page data files, including numeric URLs using h1/h2 headers

Comprehensive: Validates buttons, headers, links, paragraphs, and other UI elements

Validation Summary -
After each test, you'll see a detailed report in the respective test stdout:

```
📊 PAGE CONTENT VALIDATION SUMMARY (Test #1):
Total pages validated: 3
Pages passed: 2
Pages failed: 1
Missing elements: Submit button, Continue link
```

## 9. Functional test automation for pcs-frontend

### Categories covered:

- Page content validation
- Error Message Validation
- Page Navigation tests

Please follow this confluence page for detailed instructions and guidelines- https://tools.hmcts.net/confluence/x/14FLd

## 10. CI Pipeline Stages

### PR & Master (`Jenkinsfile_CNP`)

**Functional UI tests** use `yarn test:functional` (Chrome). Jenkins sets env vars consumed by Playwright as above.

| Branch     | Default `--grep` (`FUNCTIONAL_TEST_SCOPE`) | Notes                                                                                |
| ---------- | ------------------------------------------ | ------------------------------------------------------------------------------------ |
| **PR**     | `@PR`                                      | Preview app URL from `CHANGE_ID`.                                                    |
| **Master** | `@regression`                              | AAT URL. On failure, Allure summary may be sent to Slack `#hdp-qa-e2e-test-results`. |

**Optional GitHub labels on PRs**

| Label pattern                      | Effect                                                                                                                                                    |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `e2e-tag:<value>`                  | Non-empty value sets `FUNCTIONAL_TEST_SCOPE`; else default **`@PR`**.                                                                                     |
| `e2e-spec:<keyword>`               | If the label exists **and** the value is non-empty, sets **`E2E_SPEC`** (narrow to `*<keyword>*.spec.ts`). If no label or empty value, no spec narrowing. |
| `enable_all_page_functional_tests` | Turns on broad page validation flags used by the framework.                                                                                               |
| `enable_content_validation`        | Enables content validation.                                                                                                                               |
| `enable_error_messages_validation` | Enables error-message validation.                                                                                                                         |
| `enable_navigation_tests`          | Enables navigation tests.                                                                                                                                 |

You can combine `e2e-tag:` and `e2e-spec:` to narrow files and filter by title tag.

**API preview:** A label like `pcs-api-pr:<id>` still rewires PCS/CCD URLs for that API PR (unchanged).

### Nightly (`Jenkinsfile_nightly`)

Runs only the scheduled nightly job; it does **not** drive PR or **master** builds (`Jenkinsfile_CNP`).

- **Schedule:** Mon–Fri at ~07:00 (cron `H`).
- **E2E:** Toggles + `PLAYWRIGHT_PROJECT` run **`yarn test:E2e`** (e.g. `chrome`, `firefox`, `webkit`, `MicrosoftEdge`). Default: **Desktop Chrome** only, tag **`@nightly`**, spec blank = all files.
- **Jenkins parameters (relevant to Playwright):**
  - **`PLAYWRIGHT_GREP_TAG`** — `@nightly` (default), `(all tests)`, `@smoke`, `@regression`, or `@accessibility`. Maps to `FUNCTIONAL_TEST_SCOPE`.
  - **`PLAYWRIGHT_SPEC`** — Optional; sets **`E2E_SPEC`**. Comma/semicolon-separated keywords (see above). Empty = all spec files (subject to grep).
- **Other parameters:** **`ENABLE_ALL_PAGE_FUNCTIONAL_TESTS`** — Jenkins **choice** `true` / `false` (default **true**). Nightly always uses **AAT** (`TEST_URL`).
- **Slack:** Notifications to `#hdp-qa-e2e-test-results` (per stage configuration).
- **Stage behaviour:** A failing browser stage can be marked unstable while later stages still run (see Jenkins job logs).
