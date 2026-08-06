# Make an order — plan and context

Working notes for the judicial "Make an order" screen. Iteration 1 is on
`feat/make-order-shell` (commit `6130417`). This document explains what the screen is, who it is
for, what we decided and why, and what is left.

## What this screen is

At the end of a possession hearing a judge makes an order. Today that means dictating or writing
it out, then a caseworker types it up and issues it. "Make an order" is the screen where the judge
records what happened at the hearing and composes the order directly, in one pass.

It is one page, not a journey. The judge has the case in front of them and works down it: check
the facts, record who turned up, note any recitals, pick the order type, fill in its terms, add a
message to court staff, send it for issue.

## Who it is for

**Judges, not citizens.** This matters more than anything else in this document, because most
GOV.UK guidance is written for the opposite audience.

Judges using this screen are:

- **Expert.** They know possession law, they know what "Ground 8" means, they know the difference
  between outright and suspended possession. They do not need explanatory copy.
- **High-frequency.** A judge may make dozens of these orders in a day, in a list, under time
  pressure with parties waiting.
- **Trained.** They can be shown how the screen works once. They do not arrive cold.
- **On a large desktop monitor.** Court desks, not phones. This is not a mobile screen.

The GDS research behind "one thing per page", "don't use tabs", and "avoid sticky headers" is
grounded in citizen usage — infrequent, anxious, unfamiliar, often mobile users completing a task
once. It does not transfer to this audience. **Information density is a benefit here**, not a
cost: a judge wants the case facts and the order side by side, not spread over fifteen pages.

So: treat GDS _user research_ with caution, and follow GDS _standards_ to the letter. Those are
different things, and the distinction drives most of the decisions below.

### Accessibility is not negotiable

Departing from citizen-oriented research does not mean departing from accessibility.

- The Public Sector Bodies (Websites and Mobile Applications) Accessibility Regulations 2018
  cover internal tools, not just public-facing services.
- Judges include disabled users — including screen reader users, magnification users, and
  keyboard-only users.
- **WCAG 2.2 AA applies in full.**

One point worth being explicit about, because it is routinely misread as a mobile requirement:

> **1.4.10 Reflow is a zoom requirement.** It is specified as a 320px viewport, which is what
> 400% browser zoom produces on a 1280px monitor. Zoom is the single most widely used
> accommodation there is. So the narrow-width behaviour matters even though nobody will ever open
> this on a phone.

That is why there are a couple of `govuk-media-query` blocks in the SCSS. They are not a mobile
design. They exist so the layout survives 200–400% zoom.

## Where it came from

A prototype was built quickly in [`amc-CaseMan`](../../../../amc-CaseMan), live at
`civil-proto-node.uksouth.cloudapp.azure.com/cases/:id/make-order`. It is a genuinely useful
prototype and the shape of the screen comes from it.

It was built fast, though, and we are not copying it wholesale. Three defects were measured
in-browser and deliberately not carried over — see [Prototype defects](#prototype-defects-verified-not-assumed).

## Goals

1. **Iteration 1: the static visual shell.** Case reference, sticky case-facts panel, attendance
   register, recitals, order-type tabs, costs, staff message, action buttons. Plain scaffolded
   HTML. No data population, no POST handling, no CCD wiring.
2. **Extremely minimal but well structured.** Cut code and styles wherever possible. Prefer the
   platform over abstractions.
3. **As vanilla GOV.UK Design System as we can manage.** Stock components, stock behaviour.
4. **By the book on accessibility.** Push back on anything inaccessible rather than shipping it.
5. **Maintainable, simple, plain web.** Tim Berners-Lee stuff. Semantic HTML, progressive
   enhancement, no framework, no bespoke JavaScript.

## Constraints

| Constraint                         | Detail                                                                                              |
| ---------------------------------- | --------------------------------------------------------------------------------------------------- |
| Reuse existing chrome              | The xui header and footer already in this project, not a bespoke one.                               |
| No bespoke client-side JS          | Everything is stock govuk-frontend (tabs, conditional reveals).                                     |
| Don't disturb the citizen journeys | This app also serves citizens. No global overrides — anything wide or dense is scoped to this page. |
| Desktop-first, zoom-safe           | Large monitors are the target. Narrow widths only need to not break.                                |
| No visual parity requirement       | If the prototype did something badly, we do it properly instead.                                    |

## Scope

**In (iteration 1):** case reference block · sticky case-facts panel · attendance register ·
recitals · order-type tabs (5 panels) · costs · staff message · action buttons (inert).

**Out:** order preview / generated order wording / ProseMirror editor · template library ·
draft-order tab and review-mode bars · "view as" persona switcher · comments system · POST
handling · CCD wiring · i18n (see [Open questions](#open-questions)).

## Prototype defects — verified, not assumed

Each of these was measured in the live prototype in a browser, not taken from its `bugs/`
directory or inferred from reading the code.

### 1. Date inputs announce the wrong name — WCAG 1.3.1

`#date-tenancy-day` had a visible `<label>` reading "Date of tenancy/contract" but also
`aria-label="Day"`, which overrides it, and no `fieldset`/`legend`. With six date triples in the
panel, a screen reader user heard "Day, Month, Year" six times over with no way to tell the groups
apart.

**Fixed.** `govukDateInput` groups each triple in a `fieldset` with a `legend` naming the field;
day/month/year keep plain `<label>`s; no `aria-label` anywhere. Verified: 18 date inputs, none
with `aria-label`, all 6 groups in a fieldset with a legend.

This is exactly the class of bug that creeps in when you hand-write markup instead of using the
macros, which is why the template uses macros throughout.

### 2. Two-dimensional scrolling when zoomed — WCAG 1.4.10

At a 500px-equivalent viewport — a judge at roughly 250% zoom — the prototype document was 1020px
wide, so it scrolled both ways. Two causes:

- `.make-order-notes-fields` used fixed grid tracks (`208px 218.5px 208px 144.5px`), so the grid
  stayed 833px wide however far you zoomed. **Ours. Fixed** with a fluid `auto-fit` grid that
  drops columns on its own, with no breakpoints to maintain.
- A `min-width: 1020px` floor in the component library. **Inherited and out of scope** — this
  project already uses that library and this page cannot fix it. Raised as a follow-up.

**Our content is fixed and verified.** At a 320px viewport `#main-content` has `scrollWidth` 280
with zero overflowing descendants, and the case-facts grid collapses to a single 280px column.

The document as a whole still reports 1020px, because of the inherited floor. Worth being precise
about where that comes from, since it is easy to get wrong:

| Source                     | Rule                                                                               | Reflows to 320px?                             |
| -------------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------- |
| `.ui-component-lib-footer` | `min-width: 1020px`, plus `min-width: 900px` on its inner `.govuk-width-container` | No — **this is the floor**                    |
| `hmcts-xui-header`         | `.xui-header { min-width: 1020px }` in the shadow DOM                              | Yes, the custom element itself measures 320px |

So the binding constraint is the **footer**, in the light-DOM stylesheet, not the header. Both
rules exist, but only the footer's actually pins the document width.

### 3. Hidden tab panels submit their inputs

58 named fields from the four hidden panels appeared in `FormData` at 1280px, which is why the
prototype needed a JS-synced `#order-type-field` to track which tab was active.

Inert in iteration 1 since nothing posts. In iteration 2 the fix is to read the active panel
server-side — **not** to add a hidden mirror field.

### Deliberately _not_ treated as defects

Given the audience, all of these are reasonable and are kept:

- the information density itself
- `govuk-tabs` for order type
- the wide, full-bleed layout
- the sticky case-facts panel (measured at 329px, 37% of a 900px viewport)

## Decisions

| Area                         | Decision and reasoning                                                                                                                                                                                                                                                                                                        |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Sticky case-facts panel**  | **Keep.** A real affordance when drafting an order against the facts. Fluid grid tracks so it reflows under zoom; `max-height` + `overflow-y` so it can never swallow a zoomed viewport; `scroll-padding-top` so it never hides keyboard focus. No collapse toggle in iteration 1.                                            |
| **Order type**               | **Keep `govuk-tabs`.** Matches what judges have been shown, deep-linkable via `#tab-outright`, lets them flick between order types while deciding. Stock govuk-frontend, no custom JS.                                                                                                                                        |
| **Page width**               | Wide, via a scoped **`pcs-wide`** class. Not a global `.govuk-width-container` override — the citizen journeys in this same app want the 1020px measure.                                                                                                                                                                      |
| **Tabs markup**              | Hand-written to govuk-frontend's own tabs markup rather than via the `govukTabs` macro, because the macro takes each panel as a pre-rendered HTML string. Writing the markup lets each panel hold real Nunjucks. Behaviour still comes from `data-module="govuk-tabs"`.                                                       |
| **Attendance abbreviations** | Keep `Csl / Sol / S/A / H/O / Duty / LiP / Ltr` for scanning density, but give assistive technology the full term: `<span aria-hidden="true">` for the abbreviation plus `<span class="govuk-visually-hidden">` for the expansion. `<abbr title>` was tried and rejected — screen reader support for `title` is inconsistent. |
| **Breakpoints**              | Large desktop is the primary and only design target. The two `govuk-media-query` blocks exist solely so the layout survives 200–400% zoom. No investment in narrow-width polish beyond "nothing breaks".                                                                                                                      |
| **Client-side JS**           | **None.** Date quick-fill pills, the case-facts collapse toggle and the not-present/name interlock are all deferred.                                                                                                                                                                                                          |
| **Content**                  | Hardcoded English for iteration 1. See [Open questions](#open-questions) — this is the one place we diverge from house style.                                                                                                                                                                                                 |

## What was built

Branch `feat/make-order-shell`, commit `6130417`.

| File                                          | Lines |                                                                                                                                           |
| --------------------------------------------- | ----: | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `src/main/views/make-order.njk`               |   517 | The shell. Extends `template.njk`, not `stepsTemplate.njk` — the latter forces a two-thirds/one-third grid that fights a wide dense page. |
| `src/main/assets/scss/make-order.scss`        |   104 | `pcs-`-prefixed, `govuk-spacing()` / `govuk-colour()` / `govuk-media-query()` throughout, no raw values.                                  |
| `src/main/routes/makeOrder.ts`                |    22 | Auto-registered by the glob in `app.ts`. Builds the xui header/footer models.                                                             |
| `src/test/unit/routes/makeOrder.test.ts`      |    62 | Registration, render, and header-model-from-roles.                                                                                        |
| `src/main/constants/caseRoutes.ts`            |    +2 | `MAKE_ORDER_ROUTE`.                                                                                                                       |
| `src/main/assets/scss/main.scss`              |    +1 | `@use 'make-order';`                                                                                                                      |
| `src/test/ui/utils/controller.ts`             |    ~1 | Adds `make-order` to the axe audit page gate.                                                                                             |
| `src/test/ui/config/axe-exclusions.config.ts` |    +1 | One upstream exclusion, see below.                                                                                                        |

### Chrome: the xui header and footer, unconditionally

Other pages in this app serve both citizens and solicitors, so they branch on
`isLegalRepresentative` and fall back to the GOV.UK header. **This page is judges only, so there is
no citizen variant and no conditional** — it always renders the xui chrome judges already work in.
That is simpler than the pattern in `stepsTemplate.njk`, and it is simpler _because_ of the
narrower audience.

The route deliberately does **not** use `legalRepresentativeHeaderMiddleware`. That middleware
gates on `LEGAL_REPRESENTATIVE_USER_ROLES`, which is `['caseworker-pcs-solicitor']` — a judge does
not hold that role, so the middleware would leave `headerModel` undefined and the header would
render empty. The route builds the models directly instead, passing the signed-in user's real roles
to `buildHeaderModel` so the header renders the right menu for them.

Because the chrome is unconditional, three things follow, all of them deletions:

- `head` always pulls in `/assets/ui-component-lib/ui-component-lib.css` (served by
  `app.ts:42-43`). Without it the header renders unstyled — worth knowing, because the markup looks
  correct in the HTML while looking broken on screen.
- `beforeContent` is emptied. The xui header brings its own navigation and beta banner, so
  `template.njk`'s service navigation and phase banner would be duplicates. The language toggle
  goes too, since this page is English only, and there is no back link because this is a single
  page rather than a step in a journey.
- No `isLegalRepresentative` appears anywhere in the template.

One other implementation note that is easy to trip over: the wide layout uses the govuk base
template's existing `containerClasses` hook rather than nesting another `div`. Because
`max-width: none` kills `govuk-width-container`'s auto-centring, the gutters have to be restored
explicitly.

## Verification

All at 1600×900 unless noted.

- `yarn lint` (stylelint → eslint → prettier), `yarn tsc --noEmit`, and webpack: all clean, no
  SCSS deprecation warnings.
- `yarn test:unit`: 195 suites / 2501 tests pass, including the 3 route tests.
- axe-core 4.10.2 across WCAG 2.0/2.1/2.2 A and AA, **with the xui chrome rendered**:
  **0 violations, 30 passes**, excluding the two non-defects below.
- All 5 tabs switch correctly — one visible panel each, correct `role` / `aria-selected` /
  `aria-controls` / `aria-labelledby`.
- xui header renders with judicial branding ("Judicial Case Manager", crest, case reference
  lookup, Sign out) from a `caseworker-pcs-judge` role, and its stylesheet loads.
- Defect 1 fixed (18 date inputs, 0 `aria-label`, 6 fieldsets with legends).
- Defect 2 fixed for our content (`#main-content` `scrollWidth` 280 at a 320px viewport, 0
  overflowing descendants).

### WCAG 2.4.11 Focus Not Obscured — found and fixed during verification

The sticky panel hid keyboard focus. 18 of 62 focusable elements were _fully_ covered when
focused — a real failure, introduced by us, not inherited from the prototype.

Fixed with `scroll-padding-top` on the root element, reserving the panel's height so the browser
scrolls focused fields clear of it. Now **0 of 63 obscured** (63 once the xui header's own controls
are counted), verified at 1600×900 and at 1440×768 where the panel is also internally scrolling.

Two non-obvious details, both commented in the SCSS:

- `scroll-padding` only affects the **scrollport**, which is the root element. Putting it on the
  page wrapper left 49 elements obscured. Hence the `htmlClasses` hook rather than a class on the
  container.
- govuk-frontend already sets `scroll-padding-top: 0` on
  `.govuk-template:not(:has(.govuk-exit-this-page))` for its Exit This Page component. A lone
  class loses to that selector, so ours deliberately matches its specificity.

### Two axe results that are not defects in this page

1. **`aria-allowed-attr` / `aria-expanded` on `#outright-possession-2` — upstream
   govuk-frontend.** `radios.mjs:64` sets `aria-expanded` unconditionally on any radio with a
   conditional reveal, and `aria-expanded` is not permitted on `role=radio`. This affects the
   standard GDS conditional-reveal pattern generally — which is why
   `src/test/ui/config/axe-exclusions.config.ts` already carried **26 exclusions for exactly
   this** before this page existed. Added one more, following the existing convention and comment
   format.

   _An earlier guess that this was caused by nesting a `govukDateInput` inside the conditional was
   wrong; reading `radios.mjs` settles it._

2. **`color-contrast` incomplete on `#hearing-notes` — an axe limitation with `textarea`.**
   Reproduced on a bare, unstyled textarea, and independent of the sticky position and
   `overflow-y`. Actual contrast is black on white, 21:1.

### Not yet verified

The page has not been run against the real app (docker + OIDC). Browser verification used a
throwaway harness rendering the template with the real Nunjucks search paths, the real
`buildHeaderModel` / `buildFooterModel`, and the component library stylesheet served exactly as
`app.ts:42-43` does it. So the xui chrome is genuinely exercised, but on a running instance it is
worth confirming the header menu is the one judges should see for their actual roles.

### One inherited defect found along the way

The xui header's own skip link (in its shadow DOM) targets `#content`, which **no page in this app
provides** — the GOV.UK template calls its main landmark `#main-content`. So that skip link is
broken app-wide, not just here, which makes it a pre-existing WCAG 2.4.1 concern rather than
something this page introduced or should paper over. The page's own skip link, from the GOV.UK
template, resolves correctly. Recorded as a follow-up.

## Open questions

**i18n.** Iteration 1 hardcodes English rather than wiring `getTranslationFunction` +
`makeOrder.json` (en/cy). The reasoning: Welsh is statutory for services to the public but a much
weaker requirement for an internal judicial tool, and the page shape is still churning, so
extracting ~60 strings now means rewriting them shortly.

**Every other real page in this app uses i18n**, so this is our one divergence from house style
and it should be a conscious choice rather than a default. Say the word and the strings get
extracted.

## Follow-ups

### Next iterations

- **Order-type submit semantics** — read the active panel server-side. No hidden mirror field.
- **i18n extraction** to `makeOrder.json` (en/cy) once the content settles.
- **Progressive enhancement** — date quick-fill pills, case-facts collapse toggle,
  not-present/name interlock.
- **Order preview** — generated order wording, template library, review/draft modes. The large
  piece of work, deliberately excluded from iteration 1.
- **Data population and CCD wiring.**

### Upstream

All three are with `@hmcts-cft/cft-ui-component-lib` or govuk-frontend, and none is fixable from
this page. Worth raising together.

- **`.ui-component-lib-footer { min-width: 1020px }`** — puts a floor under the document width that
  no consuming page can escape, breaking WCAG 1.4.10 for every service that uses the footer. The
  matching `.xui-header { min-width: 1020px }` is worth raising at the same time even though it is
  not currently the binding constraint.
- **The xui header's skip link targets `#content`** — which no page in this app provides, so it is
  broken app-wide (WCAG 2.4.1). Either the library should target `#main-content`, matching the
  GOV.UK template, or make the target configurable.
- **`aria-expanded` on conditional-reveal radios** — raise with govuk-frontend, or find the
  existing issue. It is currently papered over by a growing exclusion list in every consuming
  service, which is a poor equilibrium: real violations get lost among the noise.
