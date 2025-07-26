# Test Automation Framework Documentation

## 1. Framework Overview

A structured, maintainable test automation solution built on Playwright that:

- Implements Pattern-matching
- Separates test logic from implementation details
- Provides ready-to-use components for UI interactions and validations

## 2. Core Architecture

### Key Components

1. Controller: Defines performAction/s and performValidation/s
2. Actions: Perform UI interactions
3. Validations: Verify application state
4. Registries: Component directories

## 3. Getting Started

### Prerequisites

```bash
Node.js 16+ | Playwright 1.30+ | TypeScript 4.9+
```

## 4. Available Actions and Validations

### Actions

| Action | Example Usage |
| fill | `performAction('fill', 'Email', 'test@example.com')` |
| check | `performAction('check', 'RememberMe')` |
| clickButton | `performAction('clickButton', 'Submit')` |
| clickRadioButton | `performAction('clickRadioButton', 'testRadio')` |
| login | `performAction('login', 'citizen')` |
| navigateToUrl | `performAction('navigateToUrl', 'testUrl')` |

### Validations

| Validation | Example Usage |
| text | `performValidation('text', 'testElement')` |
| value | `performValidation('value', 'testElement')` |
| visibility | `performValidation('visibility', 'testElement')` |
| enabled | `performValidation('enabled', 'testElement')` |
| checked | `performValidation('checked', 'testElement')` |
| count | `performValidation('count', 'testElement')` |
| css | `performValidation('css', 'testElement')` |
| attribute | `performValidation('attribute', 'testElement', 'attributeName')` |
| pageTitle | `performValidation('pageTitle', 'title')` |
| dashboardNotification | `performValidation('dashboardNotification', {title: 'test'})` |
| dashboardTask | `performValidation('dashboardTask', {title: 'test'})` |

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
  { action: 'fill', fieldName: 'Email', value: 'test@example.com' },
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
- PCS_IDAM_TEST_USER_PASSWORD

```bash
yarn test:functional
```

## 8. Troubleshooting

| Issue | Solution |
| "Action not found" | Check registration |
| "Validation not found" | Check registration |
| Locator failures | Verify fieldName matches UI text/attributes |
| Timeout errors | Add explicit waits in components |
