# Make an order — plan and context

Working notes for the judicial "Make an order" screen. Iteration 1 is on
`feat/make-order-shell`. This document explains what the screen is, who it is for, what we decided
and why, and what is left.

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
with `aria-label`, all groups in a fieldset with a legend.

The day/month/year labels are currently **visually hidden** for density — see
[Density](#daymonthyear-labels--visually-hidden-and-to-be-revisited). That keeps the accessible
names the prototype threw away, so this defect stays fixed; it is a visual trade-off, flagged as
temporary.

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
- the sticky case-facts panel (307px after the density work, 34% of a 900px viewport, and capped
  at `60vh` however far the page is zoomed)

## Decisions

| Area                         | Decision and reasoning                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Sticky case-facts panel**  | **Keep.** A real affordance when drafting an order against the facts. Fluid grid tracks so it reflows under zoom; `max-height` + `overflow-y` so it can never swallow a zoomed viewport; `scroll-padding-top` so it never hides keyboard focus. No collapse toggle in iteration 1.                                                                                                                                                                                                                                                                                                                                   |
| **Order type**               | **Keep `govuk-tabs`.** Matches what judges have been shown, deep-linkable via `#tab-outright`, lets them flick between order types while deciding. Stock govuk-frontend, no custom JS.                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **Page width**               | Wide, via a scoped **`pcs-wide`** class. Not a global `.govuk-width-container` override — the citizen journeys in this same app want the 1020px measure.                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **Tabs markup**              | Hand-written, not the `govukTabs` macro, **for the heading level**. The macro hardcodes its tab-list heading as `<h2>` with no option (6.4.0), which puts "Contents" level with "Order type" while the panel headings under it stay `<h3>`. That heading is `display: none` above tablet, so the broken outline surfaces exactly at ~500px — a judge at 250–400% zoom — and with no JS. `tabs.mjs` owns every `role`, `aria-*` and `tabindex` at runtime, so the markup only has to get class names, `href`/`id` pairing and initial visibility right; one `orderTypeTabs` list drives both the list and the panels. |
| **Attendance abbreviations** | Keep `Csl / Sol / S/A / H/O / Duty / LiP / Ltr` for scanning density, but give assistive technology the full term: `<span aria-hidden="true">` for the abbreviation plus `<span class="govuk-visually-hidden">` for the expansion. `<abbr title>` was tried and rejected — screen reader support for `title` is inconsistent.                                                                                                                                                                                                                                                                                        |
| **Attendance grouping**      | `role="group"` + `aria-labelledby` instead of `fieldset`/`legend`, which is the one place this page departs from the stock pattern. See [Density](#density-matching-the-prototype) — a legend cannot share a row with the fields it labels, and the workarounds are unreliable.                                                                                                                                                                                                                                                                                                                                      |
| **Breakpoints**              | Large desktop is the primary and only design target. The two `govuk-media-query` blocks exist solely so the layout survives 200–400% zoom. No investment in narrow-width polish beyond "nothing breaks".                                                                                                                                                                                                                                                                                                                                                                                                             |
| **Client-side JS**           | **None.** Date quick-fill pills, the case-facts collapse toggle and the not-present/name interlock are all deferred.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **Content**                  | Hardcoded English for iteration 1. See [Open questions](#open-questions) — this is the one place we diverge from house style.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |

## What was built

Branch `feat/make-order-shell`.

| File                                          | Lines |                                                                                                                                           |
| --------------------------------------------- | ----: | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `src/main/views/make-order.njk`               |   123 | The shell. Extends `template.njk`, not `stepsTemplate.njk` — the latter forces a two-thirds/one-third grid that fights a wide dense page. |
| `src/main/views/make-order/`                  |   445 | One partial per section of the screen — see [below](#one-file-per-section).                                                               |
| `src/main/views/make-order/tabs/`             |   653 | One partial per order type.                                                                                                               |
| `src/main/assets/scss/make-order.scss`        |   428 | `pcs-`-prefixed, `govuk-spacing()` / `govuk-colour()` / `govuk-media-query()` throughout, no raw values.                                  |
| `src/main/routes/makeOrder.ts`                |    22 | Auto-registered by the glob in `app.ts`. Requires the judge role and builds the xui header/footer models.                                 |
| `src/test/unit/routes/makeOrder.test.ts`      |    65 | Registration, render, and header-model-from-roles.                                                                                        |
| `src/main/constants/caseRoutes.ts`            |    +2 | `MAKE_ORDER_ROUTE`.                                                                                                                       |
| `src/main/assets/scss/main.scss`              |    +1 | `@use 'make-order';`                                                                                                                      |
| `src/test/ui/utils/controller.ts`             |    ~1 | Adds `make-order` to the axe audit page gate.                                                                                             |
| `src/test/ui/config/axe-exclusions.config.ts` |    +1 | One upstream exclusion, see below.                                                                                                        |

### One file per section

The page began as a single 1,112-line template, which made an individual order type impossible to
review without scrolling past the other four. It is now one file per section of the screen, with the
five order types under `tabs/`:

```
views/make-order.njk                    the shell: chrome, section order, the tabs
views/make-order/_case-summary.njk      reference, property, parties
views/make-order/_case-facts.njk        the sticky panel
views/make-order/_attendance.njk        the attendance register
views/make-order/_recitals.njk
views/make-order/_costs.njk
views/make-order/_staff-message.njk
views/make-order/_payment-frequencies.njk   the one option list shared across tabs
views/make-order/tabs/_outright.njk
views/make-order/tabs/_suspended.njk
views/make-order/tabs/_adjournment.njk
views/make-order/tabs/_strike-out.njk
views/make-order/tabs/_free-form.njk
```

Split **by the sections a judge sees**, not by a generic form schema. A JSON-driven form engine was
considered and rejected: every one of these sections has a bespoke reason for its markup — the
attendance register's `role="group"`, the inline field rows, the flattened reveals — and a schema
general enough to express all of them would be harder to read than the markup it replaced, while
putting the accessibility decisions somewhere a reviewer cannot see them.

The `_` prefix marks a fragment rather than a page: none of these renders on its own, and only
`make-order.njk` is a template a route names. Each partial imports the govuk-frontend macros it
uses, so it can be read without reference to the shell. The one list needed by more than one file
(`paymentFrequencies`, used by three tabs) is `{% import %}`ed rather than inherited from the
including context, so a tab states where its options come from; the lists used by a single section
stay in that section's file.

Refactor only. Verified by rendering the committed 1,112-line template and diffing its normalised
HTML against the split version: the only differences are the six intentional `pcs-divided-options`
additions and the one `govuk-checkboxes--inline` removal below. The tabs markup is byte-identical,
and every form control, id, name and panel class is unchanged.

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

Access is enforced separately by `judgeAccessMiddleware`, using the normalised roles in
`steps/utils/userRole.ts`. Users without `caseworker-pcs-judge` receive a 404.

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

## Density: matching the prototype

Side-by-side against the prototype, the first build was roughly **twice as tall for identical
content**. For a screen a judge works from during a hearing that is a real usability problem, not a
cosmetic one — the fewer facts visible at once, the more scrolling between the facts and the order
being drafted. Three causes, all measured rather than eyeballed:

**1. The case-facts grid was silently one column short.** The intended layout is four columns. The
track floor was `240px`, so four tracks needed `4 × 240 + 3 × 20 = 1020px`, and only `1013px` was
available — seven pixels short. `auto-fit` did exactly what it is meant to do and dropped to three
columns, which added a whole extra row.

The floor exists because a `govuk-date-input` wraps day/month/year onto two lines below a certain
width, and a wrapped date costs the grid a row. That width is **232px**, not 240 — the original
figure came from measuring the three inputs without their margins. Each date part also carries a
trailing `20px` margin, including the last one, which is dead space at the end of a grid track and
pushed the true requirement to 252px. Removing that trailing margin makes the honest floor 232px,
and four columns fit with room to spare.

Lesson worth keeping: with `auto-fit`, an off-by-a-few-pixels floor doesn't misalign anything
visibly, it just quietly changes the column count. It is only findable by measuring.

**2. Vertical spacing tuned for citizens, in three places.** The default `30px` between form groups
suits a page asking one question at a time; inside a dense reference panel it only pushes facts off
screen. Three separate margins were adding up, and it took a DOM diff against the prototype's panel
to see which:

| Where                        | Was                 | Now                | Why                                                                                                                                                                                                                                  |
| ---------------------------- | ------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Between grid rows            | `30px` field margin | `15px` `row-gap`   | A margin on the fields also applies to the **last** row, where the space falls below the panel's final row and is dead. Making it the grid's `row-gap` gives the same spacing between rows and one less row's worth of panel height. |
| Under each field's own label | `10px`              | `5px`              | Generous for one question, loose with twelve stacked. The label still clears its control by 5px — the same gap govuk-frontend uses under day/month/year — so nothing reads as cramped.                                               |
| Under Day / Month / Year     | `5px`               | hidden (see below) | These sat directly beneath a legend that already names the field.                                                                                                                                                                    |

### Day/Month/Year labels — visually hidden, and to be revisited

After the three margins above, the panel was 361px against the prototype's 329px, and the whole
remaining difference was the visible Day/Month/Year labels — about 30px per row of dates. **The
prototype has no such labels at all**, which is
[defect 1](#1-date-inputs-announce-the-wrong-name--wcag-131): with them deleted, a screen reader
user hears "Day, Month, Year" six times with nothing to tell the groups apart.

The decision was to close that last gap for now. They are **visually hidden, not deleted** — so
every input keeps its accessible name and its legend, and this is a purely visual change rather than
a re-introduction of defect 1. Verified after the change: 4 date groups, every input still resolving
a `Day` / `Month` / `Year` label, no `aria-label` anywhere, axe still clean.

It is not free, though, and the cost falls on sighted users rather than screen reader users:

- Field **order** becomes something you infer from the input widths (2, 2, 4 characters) rather
  than read. That is a guess, and a wrong one in any locale that writes dates month-first.
- It leans on a convention judges will learn quickly, which is a fair bet for this audience — but
  it is still a learned convention rather than a visible one, and date-order errors on a possession
  order are consequential.

So this is deliberately marked temporary in the SCSS, and the fix is deleting two rules. Better
answers when we come back to it: shorter labels (`D` / `M` / `Y`), a single visible hint like
`DD MM YYYY` under the group, or accepting the 30px.

**Hearing notes fills its column, and its bottom lines up with the last row of inputs.** The notes
field is the panel's second column, so it is already as tall as the facts grid beside it — the
height was going unused below a `rows="8"` textarea. Letting it flex costs nothing and gives the
judge a bigger box (204px → 210px). `rows` stays as the floor for when the panel collapses to one
column.

Getting the two columns to end level turned out to be one line, and the cause was worth
understanding. govuk-frontend gives a textarea `30px` of bottom margin, for the next question on a
citizen page. Here there is nothing below it, so that margin made the notes column 30px taller than
the facts grid — the grid then **stretched to match and spread the difference across its three
rows**, which is why the rows measured 78px for 70px of content while the box still stopped 22px
short of "Arrears today". Removing the margin aligns both bottoms exactly and takes another 24px off
the panel.

Worth noting as a shape: a stray margin on one grid item does not just add its own height, it
changes the row sizing of everything beside it. That is invisible in a screenshot and obvious in
`gridTemplateRows`.

**No resize handle on the notes box at desktop.** Its height now tracks the facts grid beside it, and
a drag handle would let the judge break that alignment — and since the panel is capped at `60vh`,
dragging would mostly just make the panel scroll internally rather than reveal more text. Removed
only at desktop: below that the panel is unpinned and the textarea is back to its `rows` floor, so
resizing stays the useful escape hatch it normally is, which matters at high zoom where fewer
characters fit per line.

**3. Attendance: the party name had its own line.** This is the interesting one. The register wants
one scannable row per party — name, attendance options, representative — but a `<fieldset>`'s
rendered `<legend>` is laid out **outside** the box containing the fieldset's other children. It
therefore cannot be a grid item, and always takes a line of its own. Five parties, five wasted
lines.

Two standard workarounds exist and both were tried and rejected:

- **`float: left` on the legend.** Works visually. But it strips the legend's special status, and
  the accessibility tree showed the party name **no longer labelling the radio group** — a WCAG
  1.3.1 regression, and worse than the height problem it solved.
- **`display: contents` on the fieldset.** Also works visually, and the DOM stays correct. But
  `display: contents` on a `<fieldset>` is [known to be handled inconsistently in the accessibility
  tree across browsers](https://github.com/w3c/csswg-drafts/issues/3226), and no CDP port was
  exposed to inspect the full tree and prove otherwise. Relying on a quirk that can't be verified
  is not worth it.

So attendance rows use **`role="group"` + `aria-labelledby`** — the ARIA equivalent of
fieldset/legend, with no layout special-casing at all. The party name becomes an ordinary first grid
column, and the grouping is explicit and directly verifiable. Confirmed: all five rows expose
`role="group"` with the party name as the accessible name, unique ids, and per-party radio `name`
attributes.

The "Name" label is visually hidden rather than deleted. With one row per party the column is
self-evident to a sighted judge, and five repetitions cost a line each; screen reader users still
get it, expanded to "Name of representative for Defendant 1: David Patel" so it is unambiguous when
reached out of context.

**Result:** case-facts panel **572px → 307px** against the prototype's 329px, attendance rows
**136px → 78px** each, page **3241px → 2703px**. Four columns, every date on one line, the notes box
ending level with the last row of inputs, and better than parity with the prototype's density —
without its accessibility defect, since the date labels are hidden rather than absent.

**Re-measure, don't eyeball.** Every one of these was invisible in a screenshot and obvious in the
numbers — the seven-pixel floor especially. Worth re-running `panelH` / `gridTemplateColumns` /
`gridTemplateRows` after any change to this panel.

## Filling in every field

The first build scaffolded each tab with a couple of representative fields. It now carries **every
field the prototype has** — all five order-type panels, the full costs list, and the attendance and
recitals sections. Still no bespoke JavaScript: reveals and tabs are stock govuk-frontend behaviour.

Coverage was checked by extracting every `id` from the prototype's template and mapping each one to
ours, rather than by reading down the page. The only prototype fields deliberately absent are the
ones belonging to excluded features — order preview, the template library, the ProseMirror editor,
comments, and the `order-type-field` / `form-action` hidden inputs that exist to work around
[defect 3](#3-hidden-tab-panels-submit-their-inputs).

### Where this departs from the prototype, and why

Each of these is also commented at the point it happens in the template.

| Departure                                                                                                                           | Reason                                                                                                                                                                                                                                                                                                          |
| ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Conditional reveals flattened to one level.** The prototype's outright money judgment nests them four deep.                       | Nesting reveals is not a pattern govuk-frontend supports. A judge tabbing through has no way to know that ticking one box grew three more levels below, and each level indents further until fields sit off to the right of the panel. Everything there is optional, so nothing is lost by showing it at once.  |
| **Payment plans stay checkboxes sharing a name**, as the prototype has them.                                                        | Not a departure. Recorded because it was first built as radios and that was wrong — see [Payment plans](#payment-plans--a-second-wrong-call-corrected).                                                                                                                                                         |
| **Revealed fields lay out along the row**, not stacked one per line.                                                                | Matches the prototype's density, which is the point of the screen, but with each field keeping its own `<label>`/`<legend>` — the prototype's hand-written rows of prose are where its date fields lost their accessible names. Flex-wrap and no fixed widths, so it folds under zoom. See `pcs-inline-fields`. |
| **Reveals nested inside the radio item they belong to** (adjournment), not siblings of the radio group.                             | The prototype's `aria-controls` points forwards out of the fieldset, and it then needs an `<h4>` in each block to say which branch you are looking at. Nested, each block is announced as part of the option that revealed it and the headings become unnecessary.                                              |
| **One shared adjournment hearing date**, not one per "Adjourned to" option.                                                         | The prototype has three day/month/year triples of which at most one can ever be filled.                                                                                                                                                                                                                         |
| **Real labels everywhere an `aria-label` was doing the work alone** — e.g. a `Time estimate` fieldset over the amount and its unit. | An `aria-label`-only control has nothing on screen naming it. Verified: 0 `aria-label`-only controls and 0 unlabelled controls on the page.                                                                                                                                                                     |
| **Costs in one column, not two.**                                                                                                   | The prototype's split falls between "Cl pay Def summary costs" and the three same-terms options, so it does not divide the list by anything, and arrow keys walk the radios in DOM order wherever they are painted. Ordered by who pays, with the conditional ones last.                                        |
| **Costs amounts as reveals under their radio**, not inline on the radio's line.                                                     | Inline needs the prototype's `data-costs-selects` script (typing in a box selects its radio) to be coherent, and still leaves the box unlabelled on screen.                                                                                                                                                     |
| **Hearing format stays checkboxes.**                                                                                                | Not a departure so much as a decision worth recording: a hearing genuinely can be more than one format.                                                                                                                                                                                                         |

### The disabled options — a wrong call, corrected

The prototype ships four options `disabled`: three costs orders "payable on the same terms as the
suspension", and "Suspended on the same terms as above" in the suspended tab. These were first left
out here, on the reasoning that an option that cannot be chosen is not a field.

**That was wrong, and reading the prototype's script settles it.** Both sets are enabled
conditionally, not permanently disabled:

- `suspended-mj-same-terms` is enabled once "Money judgment for the arrears above" is ticked
  (`make-order.js:4750`).
- The three costs options are enabled while the Suspended tab is the active one
  (`make-order.js:4683`).

So they are real fields with a dependency. Both are restored, expressed differently in each case
because the dependencies are different shapes:

- The suspended one is a **conditional reveal** on the checkbox it depends on — the same dependency
  in markup rather than in script.
- The three costs ones **cannot** be, because the dependency crosses sections: they hang off which
  order-type tab is active. That needs script or a server round-trip and there is neither yet, so
  all eleven costs options are enabled and the three carry a hint saying they need a suspended
  order. One more combination for the eventual validation to reject, which is honest for a page
  where nothing is validated yet.

Shipping them `disabled` with no script was never an option: a disabled control is not announced as
available and cannot be reached by keyboard, so it would put options on the page that no judge could
use or discover, with nothing to say what would unlock them.

**The general lesson:** "the prototype disables this" is a statement about its default markup, not
about its behaviour. Check the script before concluding a control is dead.

### Payment plans — a second wrong call, corrected

Both payment plans — "The above sums must be paid by" in the outright tab and "Arrears to be paid
by" in the suspended tab — were first built as radios, on the reasoning that a debt is paid one way
or the other and the prototype's two checkboxes sharing a name let a judge order a lump sum _and_
instalments for the same money.

**That was wrong, and the prototype's order preview settles it.** With both boxes ticked it
generates one suspension term with two sub-paragraphs:

> 2. Execution of the order for possession is suspended as long as the defendant pays (i) the rent
>    as it falls due plus (ii) the arrears of **£459.00** by:
>    - a. payment of **£12.00** to the claimant by **20 August 2026**;
>    - b. payments of **£32.00** to the claimant every month, the first instalment to be paid on or
>      before **3 September 2026**;

A payment now and the balance by instalments is an ordinary possession order, so these are two
independent options, not one choice. Both are back to checkboxes sharing a name.

Two things follow, neither of them obvious from the markup alone:

- **There is no "no payment terms" option to add.** It only existed because a radio group cannot be
  cleared once answered. Leaving both checkboxes unticked already says it.
- **It shrinks the axe exclusion from twelve controls to eight.** `aria-expanded` is allowed on
  `role=checkbox` and not on `role=radio`, so a checkbox reveal does not trip `aria-allowed-attr`
  and does not need excluding. Since an `exclude` drops the element from the scan entirely, four
  controls that were unaudited are now audited. Verified with axe-core 4.11.3 over the page with
  every tab and reveal open: 1 violation type, `aria-allowed-attr` on exactly the 8 radios the
  selector covers, 0 incomplete, 30 passes.

**The general lesson, and it is the same shape as the one above:** the prototype's markup is not its
model. The disabled options needed reading its script; this needed reading its _output_. When a
control's cardinality is in doubt, look at what the thing generates — the order wording is the
requirement, the form is one way of collecting it.

### Dividers, alignment, and the attendance register

A run of smaller visual fixes, all in `make-order.scss` and all commented there:

- **Section and question dividers are CSS borders, not `<hr>` elements.** An `<hr>` is a semantic
  thematic break, so a screen reader announces one — the prototype has four in a single tab panel —
  for something carrying no meaning the following heading has not already given. A border draws the
  same line silently. Every divider rule sits on `:not(:first-child)` or a sibling combinator, so no
  line is ever stranded above the first block of a group or below the last.
- **Dividers between options within one checkbox group are opt-in, via `.pcs-divided-options`.** The
  section and question rules select stock govuk-frontend classes and are meant to describe every
  heading and every question, so deriving them from position is what keeps them self-maintaining.
  This one is not, and as a page-wide `.govuk-checkboxes__item:not(:first-child)` it reached every
  checkbox group on the page: `Hearing format`'s three short options each picked up a 30px gap and a
  full-width rule, and a group nested in another group's reveal — `Suspended on the same terms as
above` — cannot be told apart from its parent by a descendant selector at all. A divider earns its
  place where options are long or each opens a reveal; between short one-line options it draws a
  separation that isn't there. Six groups opt in; `Hearing format` and the three single-option
  groups do not. The child combinator does the rest of the work: `classes` lands on the
  `.govuk-checkboxes` container, so `>` keeps a divided group's rules off any group revealed within
  it.
- **`govuk-checkboxes--inline` removed from `Hearing format`: it does not exist.** govuk-frontend
  6.4.0 ships `govuk-radios--inline` but has no checkboxes equivalent, so the class compiled to
  nothing and the three options stacked regardless — a class asserting a layout it could not deliver,
  and the reason the divider bug above was visible on a supposedly inline group. Found by grepping
  the compiled CSS for the selector and getting no match. Stacked is the stock presentation, and is
  now what the template says.
- **`Details of grounds (optional)` gets no divider above it.** It qualifies the Grounds radios
  rather than asking anything new. Marked `.pcs-continues-question` — named for the relationship, so
  it still reads correctly if the divider is ever drawn another way.
- **Doubled lines, found by scanning for them rather than by eye.** A general check for near-full-width
  borders within 50px of each other found three: the reported one under the last attendance row (a
  defect in our own code — `border-bottom` on every row drew a line below the last, stranded 30px
  above the Recitals rule) plus two more the screenshot did not show, where a bordered block's own
  bottom edge sat 30px above a heading's rule. Now 0.
- **Party names sit level with the radios beside them** via a 10px offset that is derived, not
  guessed: 7px of padding on `.govuk-radios__label` plus the 2.5px its 25px line box is centred by
  inside the 44px-tall item the radio input creates. `align-items: start` rather than `center`,
  because `center` levels the placeholder names but drifts 25px as soon as a party name wraps — and
  real case data will have longer names than "David Patel".
- **`Name:` is visible beside the box** rather than above it, the one place this page departs from
  govuk-frontend's stacked label. Above would cost every row a second line; beside, the row height is
  unchanged. Safe here because the field is a short, familiar, single-line value with no hint and no
  error state — it would not be safe on a citizen question where the label carries the explanation.
  The accessible name stays party-specific ("Name of representative for Claimant 1: …") so the five
  boxes are distinguishable out of context.
- **No `Staff message` heading.** The checkbox's own label says it, so a heading above it makes a
  screen reader user hear the words twice before reaching the control.

### One axe exclusion instead of a growing id list

`axe-exclusions.config.ts` now carries a single page-scoped selector,
`.pcs-make-order .govuk-radios__input[aria-expanded]`, replacing the `#outright-possession-2` entry.

An id list is not just tedious here, it is **quietly incomplete**. The page has twelve reveal
radios, but a scan of it as first loaded flags only one: axe skips hidden elements, and the other
eleven sit in a closed tab panel or an unopened reveal. So the list would grow whenever a test
clicked a tab or ticked a checkbox before the audit ran, and each new entry would look like a fresh
accessibility defect rather than the same upstream one.

Worth knowing, and now recorded in that file: an `exclude` drops the element from the scan
**entirely** rather than waiving the one rule, so those radios are no longer checked for labelling or
contrast either. That is equally true of the 26 pre-existing entries and was written down nowhere.
Their labelling is covered by the browser checks on this page instead.

## Verification

All at 1600×900 unless noted.

- `yarn lint` (stylelint → eslint → prettier), `yarn tsc --noEmit`, and webpack: all clean, no
  SCSS deprecation warnings.
- `yarn test:unit`: 195 suites / 2502 tests pass, including the 3 route tests.
- axe-core 4.11.3 across WCAG 2.0/2.1/2.2 A and AA, **with the xui chrome rendered**:
  **0 violations, 30 passes**, excluding the two non-defects below.
- All 5 tabs switch correctly — one visible panel each, correct `role` / `aria-selected` /
  `aria-controls` / `aria-labelledby`.
- xui header renders with judicial branding ("Judicial Case Manager", crest, case reference
  lookup, Sign out) from a `caseworker-pcs-judge` role, and its stylesheet loads.
- Defect 1 fixed (18 date inputs, 0 `aria-label`, 6 date groups each in a `fieldset` with a
  `legend`).
- Defect 2 fixed for our content (`#main-content` `scrollWidth` 280 at a 320px viewport, 0
  overflowing descendants, panel unpinned, grid down to one column).
- Panel height 307px, grid 4 columns at 1013px, all 4 dates on one line each, notes box bottom
  level with the last row of inputs.
- Attendance grouping checked per row: 5 `role="group"` elements, each with a unique
  `aria-labelledby` target and its own radio `name`.

The last two figures are the ones worth re-running after any layout change — they are what caught
both the grid-column and the focus-obscured problems.

### WCAG 2.4.11 Focus Not Obscured — found and fixed during verification

The sticky panel hid keyboard focus. 18 of 62 focusable elements were _fully_ covered when
focused — a real failure, introduced by us, not inherited from the prototype.

Fixed with `scroll-padding-top` on the root element, reserving the panel's height so the browser
scrolls focused fields clear of it. Now **0 of 84 obscured**, verified at 1600×900 and at 1440×768
where the panel is also internally scrolling. (84 rather than the original 62 because the xui
header's own controls are counted.)

Two non-obvious details, both commented in the SCSS:

- `scroll-padding` only affects the **scrollport**, which is the root element. Putting it on the
  page wrapper left 49 elements obscured. Hence the `htmlClasses` hook rather than a class on the
  container.
- govuk-frontend already sets `scroll-padding-top: 0` on
  `.govuk-template:not(:has(.govuk-exit-this-page))` for its Exit This Page component. A lone
  class loses to that selector, so ours deliberately matches its specificity.

### Two axe results that are not defects in this page

1. **`aria-allowed-attr` / `aria-expanded` on conditional-reveal radios — upstream
   govuk-frontend.** `radios.mjs:64` sets `aria-expanded` unconditionally on any radio with a
   conditional reveal, and `aria-expanded` is not permitted on `role=radio`. This affects the
   standard GDS conditional-reveal pattern generally — which is why
   `src/test/ui/config/axe-exclusions.config.ts` already carried **26 exclusions for exactly
   this** before this page existed. Covered here by one page-scoped selector rather than an id per
   radio; see [above](#one-axe-exclusion-instead-of-a-growing-id-list) for why the id list was the
   wrong shape.

   _An earlier guess that this was caused by nesting a `govukDateInput` inside the conditional was
   wrong; reading `radios.mjs` settles it._

2. **`color-contrast` incomplete on `#hearing-notes` — an axe limitation with `textarea`.**
   Reproduced on a bare, unstyled textarea, and independent of the sticky position and
   `overflow-y`. Actual contrast is black on white, 21:1.

### Running it locally

Everything above is now verified against the real app — signed in through OIDC at
`/case/1777027600017760/make-order`, not the throwaway render harness used at first. Two pieces of
local infrastructure are missing from the cftlib stack and have to be worked around:

- **No S2S provider.** The stack has no `rpe-service-auth-provider`, and the app refuses to boot
  without a lease (`src/main/modules/s2s/index.ts` throws `Failed to initialize S2S token`). A
  throwaway stub on `:8489` returning a well-formed unsigned JWT is enough. Kept **outside the
  repo** so the working tree stays clean.
- **The IDAM simulator needs the account created first**, or login just 401s:

  ```
  POST http://localhost:5062/testing-support/accounts
  { "email": "...", "forename": "...", "surname": "...", "password": "...",
    "roles": [{ "code": "caseworker-pcs-judge" }, { "code": "caseworker" }] }
  ```

The header menu is confirmed to be the judicial one for a `caseworker-pcs-judge` role on a real
signed-in session.

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

- **Day/Month/Year labels** — currently visually hidden for density. Decide between short labels
  (`D` / `M` / `Y`), a single `DD MM YYYY` hint under the group, or restoring them and accepting
  ~30px per date row. See [Density](#daymonthyear-labels--visually-hidden-and-to-be-revisited).
- **Order-type submit semantics** — read the active panel server-side. No hidden mirror field.
- **i18n extraction** to `makeOrder.json` (en/cy) once the content settles.
- **Progressive enhancement** — date quick-fill pills, case-facts collapse toggle,
  not-present/name interlock.
- **The three "same terms as the suspension" costs options** — currently always enabled with a hint
  saying they need a suspended order, because the dependency is on which order-type tab is active
  and there is no script or POST handling yet. Once there is either, this becomes a validation rule
  (or a reveal, if costs ever moves inside the tabs). See
  [the disabled options](#the-disabled-options--a-wrong-call-corrected).
- **Validation generally** — nothing on this page is validated. The field set is now complete, so
  the combinations that need rejecting are knowable: mutually exclusive order types, sums without
  payment terms, dates in the past.
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
