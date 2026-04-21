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

## 10. CI pipeline stages

**How the two Playwright entrypoints differ**

| Script | Grep / spec filter |
|--------|---------------------|
| **`yarn test:functional`** (PR / master) | `--grep` from **`E2E_TEST_SCOPE`** (script default **`@regression`** if unset). |
| **`yarn test:E2e`** (nightly matrix) | From **`playwright.config.ts`**: **`E2E_TEST_SCOPE`** → title grep, **`E2E_SPEC`** → optional path keywords. Jenkins only adds **`PLAYWRIGHT_PROJECT`** per browser stage. |

**Case sensitivity:** tag strings must match titles; **`E2E_SPEC`** keywords must match substrings in `*.spec.ts` paths — **same spelling and casing** in both cases. Multiple spec keywords: separate with **comma** or **semicolon**.

### `Jenkinsfile_CNP` (PR and master)

- **PR:** **`E2E_TEST_SCOPE`** = **`@PR`**, or the text after **`e2e-tag:`** (e.g. `e2e-tag:@smoke`). Optional **`e2e-spec:`** → **`E2E_SPEC`**. Labels **`enable_all_page_functional_tests`**, **`enable_content_validation`**, **`enable_visibility_validation`**, **`enable_error_messages_validation`**, **`enable_navigation_tests`** turn those checks on. **`pcs-api-pr:`** + number (e.g. `pcs-api-pr:123`) switches API/data-store URLs for preview. **`TEST_URL`** = PR preview.
- **Master:** **`E2E_TEST_SCOPE`** = **`@regression`**, **`ENABLE_ALL_PAGE_FUNCTIONAL_TESTS`** = **`false`**, **`TEST_URL`** = PCS AAT. Smoke/functional Allure; failures may Slack **`#qa-pipeline-status`**.

### `Jenkinsfile_nightly`

- **Schedule:** Weekday morning timer; also **Build with Parameters**. After a manual run, Jenkins may **reuse** the last parameter set — reset in the job UI if you want defaults again.
- **Flow:** Fortify, then one E2E stage per **ticked** browser (Chrome on by default). A failed stage does not stop the others; Allure per stage; Slack **`#qa-pipeline-status`** (see Jenkinsfile).
- **Parameters (names in the job):** **`PLAYWRIGHT_GREP_TAG`** → **`E2E_TEST_SCOPE`** (dropdown; **`(all tests)`** means no title grep). **`PLAYWRIGHT_SPEC`** → **`E2E_SPEC`**. **`ENABLE_ALL_PAGE_FUNCTIONAL_TESTS`**, **`ENABLE_AXE_AUDIT`** copied to the same env names. **`ENVIRONMENT`** / **`PR_NUMBER`** when using preview.
