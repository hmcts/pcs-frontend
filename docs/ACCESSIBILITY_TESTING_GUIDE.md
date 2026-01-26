# Accessibility Testing Guide

## Overview

This document outlines the accessibility testing requirements for the PCS Frontend application, covering both automated checks and manual testing procedures.

---

## Automated Accessibility Testing

### Tools Required

| Tool | Purpose | Integration |
|------|---------|-------------|
| **axe-core** | Automated accessibility testing | Jest/Playwright |
| **pa11y** | CLI accessibility testing | CI/CD pipeline |
| **jest-axe** | Jest integration for axe | Unit tests |

### Installation

```bash
# Install accessibility testing dependencies
npm install --save-dev axe-core @axe-core/playwright jest-axe pa11y

# Or with yarn
yarn add -D axe-core @axe-core/playwright jest-axe pa11y
```

### Jest Integration with jest-axe

**Example Test:** `src/test/unit/accessibility/page.a11y.spec.ts`

```typescript
import { axe, toHaveNoViolations } from 'jest-axe';
import { JSDOM } from 'jsdom';
import nunjucks from 'nunjucks';

expect.extend(toHaveNoViolations);

describe('Accessibility Tests', () => {
  let nunjucksEnv: nunjucks.Environment;

  beforeAll(() => {
    nunjucksEnv = nunjucks.configure('src/main/views', {
      autoescape: true,
    });
  });

  describe('Journey Step Pages', () => {
    it('step1 page should have no accessibility violations', async () => {
      const html = nunjucksEnv.render('nest-journey/step1.njk', {
        backUrl: '/dashboard',
        errors: [],
      });

      const dom = new JSDOM(html);
      const results = await axe(dom.window.document.body);

      expect(results).toHaveNoViolations();
    });

    it('error page should have no accessibility violations', async () => {
      const html = nunjucksEnv.render('nest-journey/step1.njk', {
        backUrl: '/dashboard',
        errors: [{ text: 'Select an option', href: '#decision' }],
        errorSummary: {
          titleText: 'There is a problem',
          errorList: [{ text: 'Select an option', href: '#decision' }],
        },
      });

      const dom = new JSDOM(html);
      const results = await axe(dom.window.document.body);

      expect(results).toHaveNoViolations();
    });
  });
});
```

### Playwright Integration with axe-core

**Example Test:** `src/test/e2e/accessibility/journey.a11y.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Journey Accessibility', () => {
  test('step1 page passes axe accessibility checks', async ({ page }) => {
    await page.goto('/nest-journey/step1');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('step1 with errors passes axe checks', async ({ page }) => {
    await page.goto('/nest-journey/step1');
    await page.click('button[type="submit"]'); // Submit without selection

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
```

### pa11y CLI Testing

**Configuration:** `pa11y.config.js`

```javascript
module.exports = {
  defaults: {
    standard: 'WCAG2AA',
    timeout: 30000,
    wait: 1000,
    ignore: [
      // Ignore specific rules if needed (document why)
    ],
  },
  urls: [
    'http://localhost:3000/nest-journey/step1',
    'http://localhost:3000/nest-journey/step2',
    'http://localhost:3000/nest-journey/step3',
    'http://localhost:3000/nest-journey/confirmation',
  ],
};
```

**NPM Script:** Add to `package.json`

```json
{
  "scripts": {
    "test:a11y": "pa11y-ci --config pa11y.config.js",
    "test:a11y:single": "pa11y http://localhost:3000/nest-journey/step1"
  }
}
```

### CI/CD Integration

**GitHub Actions Example:**

```yaml
# .github/workflows/accessibility.yml
name: Accessibility Tests

on: [push, pull_request]

jobs:
  a11y:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build application
        run: npm run build
        
      - name: Start server
        run: npm run start &
        
      - name: Wait for server
        run: npx wait-on http://localhost:3000
        
      - name: Run pa11y tests
        run: npm run test:a11y
        
      - name: Run axe tests
        run: npm run test -- --testPathPattern=a11y
```

---

## Manual Testing Requirements

### Keyboard Navigation Testing

**Checklist:**

| Test | Expected Behaviour | Pass/Fail |
|------|-------------------|-----------|
| Tab through all interactive elements | Focus moves in logical order | ☐ |
| Shift+Tab moves focus backwards | Focus moves in reverse order | ☐ |
| Enter/Space activates buttons | Button action triggered | ☐ |
| Enter submits forms | Form submitted | ☐ |
| Escape closes modals/dialogs | Modal closes, focus returns | ☐ |
| Arrow keys navigate radio buttons | Selection changes | ☐ |
| Focus visible on all elements | Clear focus indicator shown | ☐ |
| Skip link works | Focus moves to main content | ☐ |
| No keyboard traps | Can always tab away | ☐ |

**Testing Procedure:**

1. Start at the browser address bar
2. Press Tab to enter the page
3. Continue tabbing through all interactive elements
4. Verify focus order matches visual order
5. Test all interactive elements with keyboard only
6. Verify no focus traps exist

### Screen Reader Testing

**Recommended Screen Readers:**

| Platform | Screen Reader | Browser |
|----------|---------------|---------|
| Windows | NVDA (free) | Firefox/Chrome |
| Windows | JAWS | Chrome/Edge |
| macOS | VoiceOver | Safari |
| iOS | VoiceOver | Safari |
| Android | TalkBack | Chrome |

**Testing Checklist:**

| Test | Expected Behaviour | Pass/Fail |
|------|-------------------|-----------|
| Page title announced | Correct title read on load | ☐ |
| Headings structure logical | H1 → H2 → H3 hierarchy | ☐ |
| Form labels announced | Label read with input | ☐ |
| Error messages announced | Errors read when shown | ☐ |
| Error summary focusable | Focus moves to error summary | ☐ |
| Links have descriptive text | Purpose clear from link text | ☐ |
| Images have alt text | Alt text read for images | ☐ |
| Decorative images hidden | Not announced | ☐ |
| Tables have headers | Headers announced with cells | ☐ |
| ARIA landmarks present | Main, navigation, etc. | ☐ |

**VoiceOver Quick Commands (macOS):**

| Command | Action |
|---------|--------|
| `VO + A` | Read all from current position |
| `VO + U` | Open rotor (navigate by type) |
| `VO + Command + H` | Next heading |
| `VO + Command + J` | Next form control |
| `VO + Command + L` | Next link |

**NVDA Quick Commands (Windows):**

| Command | Action |
|---------|--------|
| `Insert + Down` | Read all |
| `H` | Next heading |
| `F` | Next form field |
| `K` | Next link |
| `E` | Next edit field |

### Zoom and Text Resize Testing

**Checklist:**

| Test | Expected Behaviour | Pass/Fail |
|------|-------------------|-----------|
| 200% zoom | Content readable, no overlap | ☐ |
| 400% zoom | Content still usable | ☐ |
| Text-only zoom 200% | Text scales, layout adapts | ☐ |
| Horizontal scroll at 320px | No horizontal scroll needed | ☐ |
| Reflow at narrow widths | Content reflows properly | ☐ |

**Testing Procedure:**

1. Set browser zoom to 200% (`Cmd/Ctrl + +`)
2. Verify all content visible without horizontal scroll
3. Verify text doesn't overlap
4. Test form submission at 200% zoom
5. Repeat at 400% zoom

### Colour and Contrast Testing

**Checklist:**

| Test | Expected Behaviour | Pass/Fail |
|------|-------------------|-----------|
| Text contrast ratio ≥ 4.5:1 | Passes WCAG AA | ☐ |
| Large text contrast ≥ 3:1 | Passes WCAG AA | ☐ |
| Focus indicator visible | 3:1 contrast minimum | ☐ |
| Information not colour-only | Shape/text also used | ☐ |
| Error states visible | Red + icon/text | ☐ |

**Tools:**

- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Colour Contrast Analyser](https://www.tpgi.com/color-contrast-checker/)
- Browser DevTools (Accessibility panel)

### Motion and Animation Testing

**Checklist:**

| Test | Expected Behaviour | Pass/Fail |
|------|-------------------|-----------|
| Reduced motion respected | Animations disabled | ☐ |
| No auto-playing content | User controls playback | ☐ |
| No flashing content | < 3 flashes per second | ☐ |

**Testing Procedure:**

1. Enable "Reduce motion" in OS settings
2. Verify animations are disabled or reduced
3. Check no content auto-plays

---

## GOV.UK Specific Requirements

### Service Standard Compliance

The service must meet [WCAG 2.2 Level AA](https://www.w3.org/WAI/WCAG22/quickref/).

**GOV.UK Design System Accessibility:**

- All GOV.UK Frontend components are tested for accessibility
- Using components correctly ensures baseline compliance
- Custom components must be tested separately

### Error Handling Requirements

**Error Summary:**

- Must appear at top of page
- Must be focusable (`tabindex="-1"`)
- Focus must move to error summary on form submission
- Each error must link to the relevant field

**Inline Errors:**

- Must be associated with field via `aria-describedby`
- Must use GOV.UK error message component
- Error text must be descriptive

**Example:**

```html
<div class="govuk-error-summary" data-module="govuk-error-summary" tabindex="-1">
  <h2 class="govuk-error-summary__title">There is a problem</h2>
  <ul class="govuk-error-summary__list">
    <li><a href="#decision">Select yes or no</a></li>
  </ul>
</div>

<div class="govuk-form-group govuk-form-group--error">
  <fieldset class="govuk-fieldset">
    <legend class="govuk-fieldset__legend">Do you agree?</legend>
    <p id="decision-error" class="govuk-error-message">
      <span class="govuk-visually-hidden">Error:</span>
      Select yes or no
    </p>
    <div class="govuk-radios" data-module="govuk-radios">
      <!-- Radio buttons with aria-describedby="decision-error" -->
    </div>
  </fieldset>
</div>
```

---

## Testing Schedule

### Per Pull Request

- [ ] Automated axe tests pass
- [ ] Keyboard navigation smoke test
- [ ] Visual regression check

### Per Sprint

- [ ] Full keyboard navigation test
- [ ] Screen reader test (NVDA or VoiceOver)
- [ ] Zoom testing (200%, 400%)

### Per Release

- [ ] Full accessibility audit
- [ ] All screen readers tested
- [ ] pa11y CI tests pass
- [ ] Manual testing checklist complete

---

## Reporting Issues

When reporting accessibility issues, include:

1. **Page/Component**: Where the issue occurs
2. **Issue Description**: What the problem is
3. **WCAG Criterion**: Which guideline is violated
4. **Impact**: Who is affected and how
5. **Steps to Reproduce**: How to find the issue
6. **Suggested Fix**: If known

**Example:**

```
Page: /nest-journey/step1
Issue: Error summary not receiving focus on form submission
WCAG: 4.1.3 Status Messages (Level AA)
Impact: Screen reader users not informed of errors
Steps: Submit form without selecting option
Fix: Add tabindex="-1" and focus() call to error summary
```

---

## Resources

- [GOV.UK Accessibility Requirements](https://www.gov.uk/service-manual/helping-people-to-use-your-service/making-your-service-accessible-an-introduction)
- [WCAG 2.2 Quick Reference](https://www.w3.org/WAI/WCAG22/quickref/)
- [GOV.UK Design System Accessibility](https://design-system.service.gov.uk/accessibility/)
- [axe-core Rules](https://dequeuniversity.com/rules/axe/)
- [pa11y Documentation](https://pa11y.org/)
