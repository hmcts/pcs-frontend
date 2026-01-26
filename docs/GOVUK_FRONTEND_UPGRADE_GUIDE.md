# GOV.UK Frontend Upgrade Guide

## Overview

This guide provides step-by-step instructions for upgrading GOV.UK Frontend in the PCS Frontend application.

**Scope:** General frontend upgrade process (not NestJS-specific)

---

## Current GOV.UK Frontend Version

As of this document:
- `govuk-frontend`: `5.13.0`

**Location:** `@/Users/sdmiddleton/Documents/HTTPS/pcs-frontend/package.json:65`

---

## Pre-Upgrade Checklist

Before upgrading GOV.UK Frontend, complete these steps:

- [ ] Review [GOV.UK Frontend Release Notes](https://github.com/alphagov/govuk-frontend/releases)
- [ ] Check for breaking changes in target version
- [ ] Review [migration guides](https://frontend.design-system.service.gov.uk/migrating-from-legacy-products/)
- [ ] Ensure all tests pass on current version
- [ ] Create a backup branch
- [ ] Check Sass/JavaScript compatibility
- [ ] Notify team of planned upgrade

---

## Upgrade Process

### Step 1: Check Current Version

```bash
# Check installed GOV.UK Frontend version
yarn list --pattern "govuk-frontend"

# Or check package.json
cat package.json | grep "govuk-frontend"
```

### Step 2: Review Breaking Changes

Visit the [GOV.UK Frontend Release Notes](https://github.com/alphagov/govuk-frontend/releases) and review:

1. **Breaking changes** between your current version and target version
2. **Deprecated features** that may affect your code
3. **New components** or features available
4. **Migration guides** for major version upgrades
5. **Accessibility improvements** or changes

**Common Breaking Changes to Watch For:**

- Sass variable name changes
- JavaScript API changes
- Component markup changes
- CSS class name changes
- Nunjucks macro parameter changes
- Asset path changes

### Step 3: Update Package Version

```bash
# Update to specific version
yarn upgrade govuk-frontend@5.x.x

# Or update to latest
yarn upgrade govuk-frontend --latest
```

**Update package.json:**

```json
{
  "dependencies": {
    "govuk-frontend": "5.x.x"
  }
}
```

### Step 4: Update Sass Imports

Check if Sass import paths have changed:

```scss
// src/main/assets/scss/main.scss
@import 'govuk-frontend';
```

**Common Sass Changes:**
- Import path changes
- Variable name changes
- Mixin signature changes
- Deprecated mixins removed

### Step 5: Update JavaScript Initialization

Check if JavaScript initialization has changed:

```typescript
// src/main/assets/js/index.ts
import { initAll } from 'govuk-frontend';

initAll();
```

**Common JavaScript Changes:**
- `initAll()` signature changes
- Component-specific initialization changes
- Module import path changes
- Browser support changes

### Step 6: Run Build

```bash
# Clean previous build
rm -rf src/main/public/

# Run webpack build
yarn build

# Check for Sass compilation errors
# Check for JavaScript bundling errors
```

**Common Build Issues:**

1. **Sass compilation errors**: Variable or mixin not found
2. **Asset copying errors**: Asset paths changed
3. **JavaScript errors**: Import paths or API changes

### Step 7: Update Component Usage

Review and update any GOV.UK Frontend component usage:

#### Check Nunjucks Templates

```bash
# Find all Nunjucks templates using GOV.UK components
find src/main/views -name "*.njk" -type f
```

**Common Component Changes:**
- Macro parameter names
- Required vs optional parameters
- New parameters added
- Deprecated parameters removed

#### Example: Error Summary Component

```njk
{# Before (hypothetical change) #}
{{ govukErrorSummary({
  titleText: "There is a problem",
  errorList: errors
}) }}

{# After #}
{{ govukErrorSummary({
  titleText: "There is a problem",
  errorList: errors,
  attributes: {
    'data-module': 'govuk-error-summary'
  }
}) }}
```

### Step 8: Update Custom Styles

Review custom styles that may override GOV.UK Frontend:

```scss
// src/main/assets/scss/main.scss
// Check for any custom overrides that may conflict
```

**Areas to Check:**
- Custom component styles
- Overridden variables
- Custom mixins using GOV.UK mixins
- Media query usage

### Step 9: Test Asset Loading

Verify all assets load correctly:

```bash
# Start development server
yarn start:dev

# Check browser console for:
# - Missing font files
# - Missing image files
# - CSS loading errors
# - JavaScript errors
```

**Assets to Verify:**
- Fonts: `/assets/fonts/`
- Images: `/assets/images/`
- Manifest: `/assets/manifest.json`
- CSS: `/main-dev.css` or `/main.[hash].css`
- JavaScript: `/main-dev.js` or `/main.[hash].js`

### Step 10: Run Tests

```bash
# Run unit tests
yarn test:unit

# Run accessibility tests
yarn test:accessibility

# Run functional tests
yarn test:functional
```

**Test Areas:**
- Component rendering
- Form validation
- Error handling
- Accessibility compliance
- Visual regression (if available)

### Step 11: Manual Testing

Test all pages and components manually:

**Testing Checklist:**
- [ ] All pages render correctly
- [ ] Forms work and validate properly
- [ ] Error summaries display and focus correctly
- [ ] Navigation works
- [ ] Buttons and links function
- [ ] Responsive design works (mobile, tablet, desktop)
- [ ] Print styles work
- [ ] JavaScript enhancements work
- [ ] Components work without JavaScript

**Pages to Test:**
- Home page
- Dashboard
- NestJS journey (all steps)
- Form pages
- Error pages
- Confirmation pages

### Step 12: Accessibility Testing

Run accessibility tests:

```bash
# Run automated accessibility tests
yarn test:accessibility

# Run pa11y tests
yarn test:a11y
```

**Manual Accessibility Checks:**
- [ ] Keyboard navigation works
- [ ] Screen reader announces content correctly
- [ ] Focus indicators visible
- [ ] Colour contrast meets WCAG AA
- [ ] Zoom to 200% works
- [ ] No accessibility regressions

See `@/Users/sdmiddleton/Documents/HTTPS/pcs-frontend/docs/MANUAL_ACCESSIBILITY_TESTING_CHECKLIST.md` for detailed checklist.

### Step 13: Update Documentation

Update documentation that references GOV.UK Frontend:

- [ ] Update `README.md` with new version
- [ ] Update component documentation
- [ ] Update style guide if applicable
- [ ] Document any breaking changes encountered
- [ ] Update this guide with lessons learned

---

## Version-Specific Upgrade Notes

### Upgrading from v4 to v5

**Major Breaking Changes:**

1. **Sass API Changes**
   - Some Sass variables renamed
   - Deprecated mixins removed
   - New settings structure

2. **JavaScript Changes**
   - `initAll()` now requires explicit configuration for some components
   - Some component APIs changed

3. **Component Changes**
   - Exit this page component added
   - Service navigation component added
   - Some component markup updated

**Migration Steps:**

```bash
# 1. Update package
yarn upgrade govuk-frontend@5.x.x

# 2. Update Sass imports (if needed)
# Check for any deprecated variables

# 3. Update JavaScript initialization
# Review initAll() usage

# 4. Test thoroughly
yarn test
yarn start:dev
```

### Upgrading from v3 to v4

**Major Breaking Changes:**

1. **Node Sass to Dart Sass**
   - Must use Dart Sass (sass package)
   - Remove node-sass if present

2. **Import Paths**
   - Import paths may have changed

3. **Component Updates**
   - Several components updated with new features

**Migration Steps:**

```bash
# 1. Remove node-sass
yarn remove node-sass

# 2. Install sass
yarn add -D sass

# 3. Update govuk-frontend
yarn upgrade govuk-frontend@4.x.x

# 4. Update webpack sass-loader config
# Ensure using sass (Dart Sass) not node-sass
```

---

## Troubleshooting

### Issue: Sass Compilation Fails

**Error:** `Undefined variable` or `Undefined mixin`

**Solution:**
1. Check release notes for variable/mixin changes
2. Update variable names in your custom Sass
3. Ensure import order is correct

```scss
// Correct import order
@import 'govuk-frontend'; // Import GOV.UK Frontend first
@import 'custom-styles'; // Then custom styles
```

### Issue: Fonts Not Loading

**Error:** 404 errors for font files

**Solution:**
1. Check webpack configuration copies fonts correctly
2. Verify font paths in CSS
3. Check publicPath in webpack config

```javascript
// webpack/govukFrontend.js
{ from: fonts, to: 'assets/fonts' }
```

### Issue: JavaScript Components Not Working

**Error:** Components not initializing

**Solution:**
1. Check `initAll()` is called
2. Verify `data-module` attributes present on components
3. Check browser console for errors
4. Ensure JavaScript file is loaded

```typescript
// src/main/assets/js/index.ts
import { initAll } from 'govuk-frontend';

initAll(); // Must be called
```

### Issue: Nunjucks Templates Broken

**Error:** Template rendering errors

**Solution:**
1. Check macro parameter names haven't changed
2. Review component documentation for updates
3. Check for required parameters

```bash
# Check GOV.UK Frontend component documentation
# https://design-system.service.gov.uk/components/
```

### Issue: Styles Look Different

**Cause:** CSS specificity or override issues

**Solution:**
1. Check custom styles aren't overriding GOV.UK styles incorrectly
2. Review CSS class names for changes
3. Check for deprecated classes

---

## Rollback Procedure

If upgrade causes critical issues:

### Step 1: Revert Package Changes

```bash
# Checkout previous package.json and yarn.lock
git checkout HEAD~1 package.json yarn.lock

# Reinstall dependencies
yarn install
```

### Step 2: Rebuild Assets

```bash
# Clean build directory
rm -rf src/main/public/

# Rebuild
yarn build
```

### Step 3: Restart Application

```bash
# Restart development server
yarn start:dev
```

### Step 4: Verify Rollback

- [ ] Application starts successfully
- [ ] Pages render correctly
- [ ] Tests pass
- [ ] No console errors

### Step 5: Document Issues

Create a document with:
- What went wrong
- Error messages
- Which components failed
- Blockers for upgrade
- Plan for retry

---

## Best Practices

### 1. Test in Development First

Always test upgrades in development environment before production:
- Local development
- Development/staging environment
- Then production

### 2. Upgrade Minor Versions First

Don't skip versions. Upgrade incrementally:
- v5.0.0 → v5.1.0 → v5.2.0 (Good)
- v5.0.0 → v5.2.0 (Acceptable)
- v4.x → v5.x (Requires careful testing)

### 3. Review All Components

Check every GOV.UK Frontend component used in your application:
- Buttons
- Forms
- Error summaries
- Radios/Checkboxes
- Accordions
- Tabs
- Notification banners
- etc.

### 4. Test Accessibility Thoroughly

GOV.UK Frontend updates often include accessibility improvements. Verify:
- No accessibility regressions
- New accessibility features work
- WCAG compliance maintained

### 5. Keep Dependencies Updated

Keep related dependencies updated:
- `sass`: For Sass compilation
- `sass-loader`: For webpack
- Webpack and related plugins

### 6. Monitor for Deprecation Warnings

Watch for deprecation warnings in:
- Sass compilation output
- Browser console
- Build logs

---

## Compatibility Matrix

| GOV.UK Frontend | Node.js | Sass | Browser Support |
|-----------------|---------|------|-----------------|
| v5.x | ≥16.0.0 | Dart Sass | IE11+, Modern browsers |
| v4.x | ≥12.0.0 | Dart Sass | IE11+, Modern browsers |
| v3.x | ≥10.0.0 | Node Sass or Dart Sass | IE8+, Modern browsers |

**Current Project Versions:**
- Node.js: ≥18.0.0
- Sass: ^1.65.1 (Dart Sass)
- Webpack: ^5.88.2

---

## Testing Checklist

After upgrade, verify:

### Visual Testing
- [ ] All pages render correctly
- [ ] Spacing and layout correct
- [ ] Typography correct
- [ ] Colours correct
- [ ] Icons and images display

### Functional Testing
- [ ] Forms submit correctly
- [ ] Validation works
- [ ] Error summaries display
- [ ] Navigation works
- [ ] Buttons and links work
- [ ] JavaScript enhancements work
- [ ] Progressive enhancement works (JS disabled)

### Responsive Testing
- [ ] Mobile view (320px+)
- [ ] Tablet view (768px+)
- [ ] Desktop view (1024px+)
- [ ] Print styles

### Accessibility Testing
- [ ] Keyboard navigation
- [ ] Screen reader compatibility
- [ ] Focus indicators visible
- [ ] Colour contrast
- [ ] Zoom to 200%
- [ ] Automated tests pass

### Browser Testing
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] IE11 (if required)

---

## Post-Upgrade Tasks

After successful upgrade:

- [ ] Update CHANGELOG.md
- [ ] Update package.json version constraints
- [ ] Run security audit: `yarn audit`
- [ ] Update CI/CD pipelines if needed
- [ ] Notify team of successful upgrade
- [ ] Monitor production for issues
- [ ] Update component library/style guide
- [ ] Update this guide with lessons learned

---

## Resources

- [GOV.UK Frontend Documentation](https://frontend.design-system.service.gov.uk/)
- [GOV.UK Design System](https://design-system.service.gov.uk/)
- [GOV.UK Frontend GitHub](https://github.com/alphagov/govuk-frontend)
- [GOV.UK Frontend Release Notes](https://github.com/alphagov/govuk-frontend/releases)
- [GOV.UK Frontend Migration Guides](https://frontend.design-system.service.gov.uk/migrating-from-legacy-products/)
- [GOV.UK Frontend Support](https://design-system.service.gov.uk/get-in-touch/)

---

## Related Documentation

- `@/Users/sdmiddleton/Documents/HTTPS/pcs-frontend/docs/GOVUK_FRONTEND_JS_COMPILATION.md` - JS compilation process
- `@/Users/sdmiddleton/Documents/HTTPS/pcs-frontend/docs/GOVUK_FRONTEND_BUILD_GUIDE.md` - Build process
- `@/Users/sdmiddleton/Documents/HTTPS/pcs-frontend/docs/GOVUK_FRONTEND_TESTING.md` - Testing guide
- `@/Users/sdmiddleton/Documents/HTTPS/pcs-frontend/docs/MANUAL_ACCESSIBILITY_TESTING_CHECKLIST.md` - Accessibility testing
