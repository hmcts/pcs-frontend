# GOV.UK Frontend Build & Compilation Guide

## Overview

This document explains how GOV.UK Frontend assets (Sass, JavaScript, images, fonts) are compiled and bundled in this project, addressing the MH Spike Specification requirements.

---

## Current Implementation

### ✅ Sass Compilation (From Source, Not Dist)

**Requirement Met:** The project compiles GOV.UK Frontend from Sass source files, not the pre-built dist CSS.

**How It Works:**

```
src/main/assets/scss/main.scss
         ↓
   @import 'govuk-frontend'
         ↓
   sass-loader (webpack)
         ↓
   css-loader → MiniCssExtractPlugin
         ↓
   src/main/public/main-dev.css (or main.[hash].css in production)
```

**Key Files:**

| File | Purpose |
|------|---------|
| `src/main/assets/scss/main.scss` | Entry point, imports `govuk-frontend` |
| `webpack/scss.js` | Sass compilation configuration |
| `webpack/govukFrontend.js` | GOV.UK Frontend asset paths |

**Configuration:** `@/Users/sdmiddleton/Documents/HTTPS/pcs-frontend/webpack/scss.js`

```javascript
{
  test: /\.scss$/,
  use: [
    'style-loader',
    MiniCssExtractPlugin.loader,
    'css-loader',
    {
      loader: 'sass-loader',
      options: {
        sassOptions: {
          quietDeps: true,  // Suppress deprecation warnings
        },
      },
    },
  ],
}
```

**Benefits of Compiling from Source:**

1. **Tree-shaking** - Only include styles you actually use
2. **Customisation** - Override Sass variables before compilation
3. **Consistency** - Same compilation process as GOV.UK recommends
4. **Smaller bundles** - Can exclude unused component styles

---

### JavaScript Compilation Investigation

**Requirement:** Investigate how GOV.UK Frontend JS is compiled for browser use.

#### GOV.UK Frontend JS Distribution Options

GOV.UK Frontend v5.13.0 provides multiple JavaScript formats:

| File | Format | Size | Use Case |
|------|--------|------|----------|
| `all.bundle.js` | CommonJS (bundled) | 103KB | Legacy bundlers, `require()` |
| `all.bundle.mjs` | ES Modules (bundled) | 97KB | Modern bundlers, `import` |
| `all.mjs` | ES Modules (unbundled) | 1.3KB | Tree-shaking with bundler |
| `govuk-frontend.min.js` | UMD (minified) | 48KB | Direct `<script>` tag |

#### Current Project Approach

**File:** `@/Users/sdmiddleton/Documents/HTTPS/pcs-frontend/src/main/assets/js/index.ts`

The project currently imports GOV.UK Frontend JavaScript and initialises it:

```typescript
import { initAll } from 'govuk-frontend';

// Initialise all GOV.UK Frontend components
initAll();
```

**Webpack Compilation:**

```
src/main/assets/js/index.ts
         ↓
   ts-loader (TypeScript → JavaScript)
         ↓
   webpack bundling (includes govuk-frontend)
         ↓
   src/main/public/main-dev.js (or main.[hash].js)
```

#### Recommended Approaches

**Option 1: Current Approach (Bundled via Webpack) ✅ RECOMMENDED**

```typescript
// index.ts
import { initAll } from 'govuk-frontend';
initAll();
```

**Pros:**
- Single bundle for all JS
- Tree-shaking possible with ES modules
- TypeScript type checking
- Consistent build process

**Cons:**
- Larger initial bundle
- All components included even if unused

**Option 2: Selective Component Import (Tree-Shaking)**

```typescript
// Only import components you use
import { Accordion, Button, Radios } from 'govuk-frontend';

// Initialise specific components
const accordions = document.querySelectorAll('[data-module="govuk-accordion"]');
accordions.forEach(el => new Accordion(el));
```

**Pros:**
- Smaller bundle size
- Only includes used components

**Cons:**
- More manual setup
- Must track which components are used

**Option 3: Direct Script Tag (No Bundling)**

```html
<script src="/assets/govuk-frontend.min.js"></script>
<script>window.GOVUKFrontend.initAll()</script>
```

**Pros:**
- No build step for JS
- Can use CDN caching

**Cons:**
- No tree-shaking
- Separate HTTP request
- No TypeScript benefits

#### Recommendation

**Use Option 1 (Current Approach)** for these reasons:

1. **Consistency** - Same build process for all JS
2. **Type Safety** - TypeScript integration
3. **Single Bundle** - Fewer HTTP requests
4. **Future-Proof** - Easy to switch to tree-shaking later

---

## Asset Copying

**File:** `@/Users/sdmiddleton/Documents/HTTPS/pcs-frontend/webpack/govukFrontend.js`

GOV.UK Frontend assets are copied during build:

```javascript
new CopyWebpackPlugin({
  patterns: [
    { from: images, to: 'assets/images' },      // Crown, favicon, etc.
    { from: fonts, to: 'assets/fonts' },        // GDS Transport font
    { from: `${assets}/manifest.json`, to: 'assets' },
    { from: `${root}/template.njk`, to: '../views/govuk' },
    { from: `${root}/components`, to: '../views/govuk/components' },
    { from: `${root}/macros`, to: '../views/govuk/macros' },
  ],
})
```

**Assets Copied:**

| Asset Type | Source | Destination |
|------------|--------|-------------|
| Images | `govuk-frontend/dist/govuk/assets/images` | `public/assets/images` |
| Fonts | `govuk-frontend/dist/govuk/assets/fonts` | `public/assets/fonts` |
| Manifest | `govuk-frontend/dist/govuk/assets/manifest.json` | `public/assets` |
| Template | `govuk-frontend/dist/govuk/template.njk` | `views/govuk` |
| Components | `govuk-frontend/dist/govuk/components` | `views/govuk/components` |
| Macros | `govuk-frontend/dist/govuk/macros` | `views/govuk/macros` |

---

## Build Commands

```bash
# Development build (with source maps, no minification)
npm run build:dev
# or
yarn build:dev

# Production build (minified, hashed filenames)
npm run build
# or
yarn build

# Watch mode for development
npm run dev
# or
yarn dev
```

---

## Customising GOV.UK Frontend

### Overriding Sass Variables

Create a file to override variables before importing GOV.UK Frontend:

```scss
// src/main/assets/scss/_settings.scss

// Override brand colour
$govuk-brand-colour: #1d70b8;

// Override font stack
$govuk-font-family: "GDS Transport", arial, sans-serif;

// Override breakpoints
$govuk-breakpoints: (
  mobile: 320px,
  tablet: 641px,
  desktop: 769px
);
```

Then import in order:

```scss
// main.scss
@import 'settings';           // Your overrides first
@import 'govuk-frontend';     // Then GOV.UK Frontend
@import 'your-styles';        // Then your custom styles
```

### Adding Custom Components

```scss
// src/main/assets/scss/_custom-component.scss
.my-custom-component {
  @include govuk-font($size: 19);
  @include govuk-responsive-margin(6, "bottom");
  
  background-color: govuk-colour("light-grey");
  padding: govuk-spacing(4);
}
```

---

## Upgrading GOV.UK Frontend

See `@/Users/sdmiddleton/Documents/HTTPS/pcs-frontend/docs/UPGRADE_GUIDE.md` for detailed upgrade instructions.

**Quick Upgrade:**

```bash
# Check current version
npm list govuk-frontend

# Update to latest
npm update govuk-frontend

# Or specific version
npm install govuk-frontend@5.14.0

# Rebuild assets
npm run build

# Run tests to verify
npm test
```

---

## Troubleshooting

### Sass Deprecation Warnings

If you see warnings about `@import` being deprecated:

```
Sass @import rules are deprecated and will be removed in Dart Sass 3.0.0.
```

**Solution:** These are from GOV.UK Frontend itself and are suppressed with `quietDeps: true`. GOV.UK Frontend will update to `@use` in a future version.

### Missing Fonts

If fonts don't load, check:

1. Font files are copied to `public/assets/fonts`
2. CSS references correct path (`/assets/fonts/`)
3. CORS headers allow font loading

### JavaScript Not Initialising

If components don't work:

```javascript
// Check GOV.UK Frontend is loaded
console.log(window.GOVUKFrontend);

// Manually initialise
import { initAll } from 'govuk-frontend';
document.addEventListener('DOMContentLoaded', () => {
  initAll();
});
```

---

## References

- [GOV.UK Frontend Documentation](https://frontend.design-system.service.gov.uk/)
- [GOV.UK Frontend GitHub](https://github.com/alphagov/govuk-frontend)
- [Sass Guidelines](https://frontend.design-system.service.gov.uk/sass-api-reference/)
- [JavaScript API](https://frontend.design-system.service.gov.uk/importing-css-assets-and-javascript/)
