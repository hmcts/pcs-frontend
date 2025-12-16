# Judicial Feedback TODO (11 Dec 2025)

Source: `/Users/alex/Documents/context/possessions/designs/Order-drawing form notes from judicial testing group 11 Dec.pdf`

## Out of scope (for now)

- [ ] “Hearings for today” task list presentation
- [ ] Separate interfaces for: mortgage cases, warrant suspension applications, longer/free-form directions orders

## Global decisions / logic

- [ ] **Standard directions dates**: default from **Order Date (today)** (+14d / +28d), not next-hearing date.
- [ ] **Costs: “Suspended on same terms”**: only show/enable when a payment plan exists in the order:
  - Suspended Possession Order selected (and payment terms exist), OR
  - Adjourned generally with permission to restore selected AND payment terms (current rent + £X …) filled in.

## Stories (prioritised)

### JF-01 Header & case information
- [x] Make party names (Claimant/Defendant) bolder and bigger.
- [x] Add “per week” to Current Rent frequency dropdown.
- [x] DoD: UI matches AC; verified via MCP Playwright; commit `JF-01`.

### JF-02 Recording attendance
- [x] Reorder attendance radio options: `Csl`, `Sol`, `S/A`, `H/O`, `Duty`, `LiP`, `Not present`.
- [x] Reduce radio button size/spacing to use less screen space.
- [x] Ensure “Name” fields are saved/recorded but **not** pulled into generated Order text.
- [x] DoD: UI + generated order behavior correct; verified via MCP Playwright; commit `JF-02`.

### JF-03 New section: Judgment
- [ ] Add a checkbox section “Judgment” after “Suspended possession order”.
- [ ] Defendant selection checkboxes (First/Second Defendant labels from case data).
- [ ] Monetary heads:
  - [ ] Arrears £
  - [ ] Interest £
  - [ ] Use & occupation daily rate £ from date until possession given up
- [ ] Add checkbox “Suspended on the same terms” (only available if Suspended Possession selected).
- [ ] Add instalments option: “by instalments of £ per (Week/Month/Year/Other)” + “first payment by [date]”.
  - [ ] If “Other”, show free-text period input (e.g., “4 weeks”).
- [ ] DoD: data captured + reflected in order output as required; verified via MCP Playwright; commit `JF-03`.

### JF-04 Possession grounds
- [ ] Add mechanism to indicate Mandatory vs Discretionary.
- [ ] If Discretionary selected, allow optional grounds input.
- [ ] DoD: UI + generated order reflect selection; verified via MCP Playwright; commit `JF-04`.

### JF-05 Suspended possession order refinements
- [ ] Remove date box from “suspended on payment of arrears of …” row.
- [ ] Change label in instalments row from “by” to “first payment by”.
- [ ] Add “Other” to frequency dropdown; when selected, show free-text period input.
- [ ] DoD: UI matches PDF wording; verified via MCP Playwright; commit `JF-05`.

### JF-06 Adjournment configuration + “adjourned generally”
- [ ] Make next hearing date explicitly optional, with choice:
  - [ ] “First available date after …” (date/period widget)
  - [ ] “On …” (fixed date)
- [ ] Provide time estimate input (supports blank free text).
- [ ] Add “Notes for listing officer” free text (not shown in generated order text).
- [ ] Remove from judge UI: hearing type, location, time of day, reason for adjournment.
- [ ] Add radio option: “Adjourned generally with permission to restore”.
  - [ ] Optional payment terms (current rent + £X per period, first payment by date; period supports Other + free text)
  - [ ] Optional strike-out clause with date/time (“4pm on …”)
- [ ] DoD: UI + order output follow optional/visibility rules; verified via MCP Playwright; commit `JF-06`.

### JF-07 Dismissed / struck out
- [ ] Create section “Dismissed / struck out”.
- [ ] Two mutually exclusive radio buttons: dismissed vs struck out.
- [ ] DoD: selection reflected in order output; verified via MCP Playwright; commit `JF-07`.

### JF-08 Directions (standard)
- [ ] Add “Insert standard directions” button.
- [ ] Insert text with dates calculated from **Order Date (today)**:
  - [ ] Defence/Counterclaim by **4pm** on OrderDate + 14d
  - [ ] Claimant reply by **4pm** on OrderDate + 28d
- [ ] Inserted block must be fully editable.
- [ ] DoD: defaults correct; verified via MCP Playwright; commit `JF-08`.

### JF-09 Costs
- [ ] Remove “basis of assessment” under “summarily assessed”.
- [ ] Add options:
  - [ ] Costs in the case
  - [ ] Suspended on same terms (conditional; see Global decisions)
  - [ ] [Silent] (no order on costs)
  - [ ] Other (shows free text area)
- [ ] DoD: options rendered + output correct; verified via MCP Playwright; commit `JF-09`.
