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
│   ├── pft-debug-log.ts       # Optional [PFT] debug logging (ENABLE_PFT_DEBUG_LOG)
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

### PFT debug logging (optional)

**`[PFT]`** console lines (trigger, EMV, page-navigation) are **on by default** in `playwright.config.ts`:

```typescript
export const enable_pft_debug_log = process.env.ENABLE_PFT_DEBUG_LOG || 'true';
```

Set **`ENABLE_PFT_DEBUG_LOG=false`** in the environment when you want to hide those lines (e.g. noisy CI). If you still see no EMV/navigation logs, ensure PFT is enabled: **`ENABLE_CONTENT_VALIDATION`**, **`ENABLE_ERROR_MESSAGES_VALIDATION`**, **`ENABLE_NAVIGATION_TESTS`**, or **`ENABLE_ALL_PAGE_FUNCTIONAL_TESTS=true`**.

- **`utils/common/pft-debug-log.ts`**: **`logPftValidationInformation`** runs after each EMV / page-navigation check. **`[PFT]`** console lines are printed **whenever** `enable_pft_debug_log === 'true'` — **pass and fail**. **Screenshots** attach to the report **only when** that check **failed**. Page navigation lines may include **`nav: from "…" | control: "…"`**.
- **`triggerPageFunctionalTests`**: stderr if the URL segment is missing from **`urlToFileMapping.config.ts`**. When `ENABLE_PFT_DEBUG_LOG=true`, one stdout line per **first PFT run for that page in the test run** (`[PFT] Triggering Functional Tests for Page: … and URL: …`), after lock/duplicate skips.
- **Page content** (`pageContent.validation.ts`): when `ENABLE_PFT_DEBUG_LOG=true`, one line when content validation runs: **`[PFT] page content | page: … | url: …`**.

Screenshots are **not** gated by `ENABLE_PFT_DEBUG_LOG` (they run on failure whenever `logPftValidationInformation` is called with `failed: true`). The env flag gates **console** output from this helper and from trigger/mapping messages.

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

### PR & Master (Jenkinsfile_CNP)

- **PR:** Runs functional tests (`@PR` scope) on Chrome. Optional full functional test if `enable_full_functional_tests` label is added.
- **Master:** Runs functional tests (`@regression` scope) on Chrome. Sends Slack notification to `#hdp-qa-e2e-test-results` on failure.

### Nightly (Jenkinsfile_nightly)

- **Schedule:** Mon–Fri at ~07:00.
- **E2E tests:** Runs per-browser stages (Chrome, Firefox, Safari) with separate Allure reports for each.
- **Accessibility:** Runs `@accessibility` tests on Chrome.
- **Slack:** Sends notification to `#hdp-qa-e2e-test-results` with links to all 4 reports (Chrome, Firefox, Safari, Accessibility).
- **Stage behaviour:** If a browser fails, the stage shows red but the pipeline continues to the next browser. All stages always run.
