# Manual Accessibility Testing Checklist

## Overview

This document provides a comprehensive checklist for manual accessibility testing of the PCS Frontend application, covering keyboard navigation, screen reader testing, and other manual verification requirements.

**Scope:** General frontend accessibility requirements (not NestJS-specific)

---

## Testing Schedule

### Per Pull Request
- [ ] Keyboard navigation smoke test (5 minutes)
- [ ] Visual focus indicators visible
- [ ] No obvious keyboard traps

### Per Sprint
- [ ] Full keyboard navigation test (30 minutes)
- [ ] Screen reader test with NVDA or VoiceOver (45 minutes)
- [ ] Zoom testing at 200% and 400% (15 minutes)

### Per Release
- [ ] Complete accessibility audit
- [ ] All screen readers tested (NVDA, JAWS, VoiceOver)
- [ ] Full manual testing checklist completed
- [ ] Accessibility statement updated

---

## 1. Keyboard Navigation Testing

### 1.1 Basic Keyboard Navigation

| Test | Expected Behaviour | How to Test | Pass/Fail |
|------|-------------------|-------------|-----------|
| **Tab key moves focus forward** | Focus moves to next interactive element in logical order | Press Tab repeatedly through the page | ☐ |
| **Shift+Tab moves focus backward** | Focus moves to previous interactive element | Press Shift+Tab to move backwards | ☐ |
| **Focus order is logical** | Focus order matches visual order and reading order | Tab through page and verify order makes sense | ☐ |
| **Focus visible on all elements** | Clear visual indicator (outline/border) on focused element | Tab through and verify focus ring visible | ☐ |
| **No keyboard traps** | Can always tab away from any element | Verify you can exit all components | ☐ |
| **Skip link works** | "Skip to main content" link appears and works | Tab from address bar, press Enter on skip link | ☐ |

**Testing Procedure:**
1. Start at the browser address bar
2. Press Tab to enter the page
3. Verify skip link appears and is visible
4. Press Enter on skip link to test it works
5. Continue tabbing through all interactive elements
6. Verify focus order matches visual layout
7. Test Shift+Tab to move backwards
8. Ensure you can exit all components without getting trapped

### 1.2 Form Controls

| Test | Expected Behaviour | How to Test | Pass/Fail |
|------|-------------------|-------------|-----------|
| **Radio buttons navigable with arrows** | Arrow keys change selection within radio group | Tab to radio group, use arrow keys | ☐ |
| **Checkboxes toggle with Space** | Space bar checks/unchecks checkbox | Tab to checkbox, press Space | ☐ |
| **Buttons activate with Enter/Space** | Button action triggered by Enter or Space | Tab to button, press Enter or Space | ☐ |
| **Enter submits forms** | Pressing Enter in text field submits form | Type in field, press Enter | ☐ |
| **Select dropdowns open with Space** | Space or Enter opens dropdown | Tab to select, press Space | ☐ |
| **Dropdown navigable with arrows** | Arrow keys navigate options | Open dropdown, use arrow keys | ☐ |

**Testing Procedure:**
1. Navigate to a form page (e.g., `/nest-journey/step1`)
2. Tab to each form control
3. Test interaction with keyboard only
4. Verify all controls are operable without mouse

### 1.3 Interactive Components

| Test | Expected Behaviour | How to Test | Pass/Fail |
|------|-------------------|-------------|-----------|
| **Accordions toggle with Enter/Space** | Accordion expands/collapses | Tab to accordion, press Enter | ☐ |
| **Tabs switch with arrow keys** | Left/Right arrows change active tab | Tab to tab list, use arrow keys | ☐ |
| **Modals trap focus** | Focus stays within modal when open | Open modal, tab through content | ☐ |
| **Escape closes modals** | Esc key closes modal and returns focus | Open modal, press Escape | ☐ |
| **Details component toggles** | Details/summary expands with Enter/Space | Tab to details, press Enter | ☐ |

### 1.4 Error Handling

| Test | Expected Behaviour | How to Test | Pass/Fail |
|------|-------------------|-------------|-----------|
| **Error summary receives focus** | Focus moves to error summary on validation | Submit invalid form, check focus | ☐ |
| **Error links work** | Clicking error link moves focus to field | Click error link in summary | ☐ |
| **Inline errors announced** | Error associated with field via aria-describedby | Check field has aria-describedby | ☐ |

**Testing Procedure:**
1. Navigate to form page
2. Submit form without filling required fields
3. Verify focus moves to error summary
4. Tab through error links
5. Press Enter on error link
6. Verify focus moves to relevant field

---

## 2. Screen Reader Testing

### 2.1 Recommended Screen Readers

| Platform | Screen Reader | Browser | Download |
|----------|---------------|---------|----------|
| **Windows** | NVDA (free) | Firefox/Chrome | [nvaccess.org](https://www.nvaccess.org/) |
| **Windows** | JAWS | Chrome/Edge | [freedomscientific.com](https://www.freedomscientific.com/products/software/jaws/) |
| **macOS** | VoiceOver (built-in) | Safari | Built into macOS (Cmd+F5) |
| **iOS** | VoiceOver (built-in) | Safari | Settings > Accessibility > VoiceOver |
| **Android** | TalkBack | Chrome | Settings > Accessibility > TalkBack |

### 2.2 VoiceOver Testing (macOS)

**Activation:** Press `Cmd + F5` to toggle VoiceOver on/off

**Essential Commands:**

| Command | Action |
|---------|--------|
| `VO + A` | Read all from current position |
| `VO + Right/Left Arrow` | Move to next/previous item |
| `VO + U` | Open rotor (navigate by type) |
| `VO + Command + H` | Next heading |
| `VO + Command + J` | Next form control |
| `VO + Command + L` | Next link |
| `VO + Space` | Activate link/button |
| `Control` | Stop reading |

**Note:** `VO` = `Control + Option`

### 2.3 NVDA Testing (Windows)

**Activation:** Press `Ctrl + Alt + N` to start NVDA

**Essential Commands:**

| Command | Action |
|---------|--------|
| `Insert + Down Arrow` | Read all from current position |
| `H` | Next heading |
| `F` | Next form field |
| `K` | Next link |
| `E` | Next edit field |
| `B` | Next button |
| `Insert + F7` | Elements list |
| `Enter` or `Space` | Activate link/button |
| `Insert + S` | Speech mode (toggle) |

**Note:** `Insert` can be replaced with `Caps Lock` in laptop layout

### 2.4 Screen Reader Testing Checklist

| Test | Expected Behaviour | How to Test | Pass/Fail |
|------|-------------------|-------------|-----------|
| **Page title announced** | Correct page title read when page loads | Navigate to page, listen for title | ☐ |
| **Heading structure logical** | H1 → H2 → H3 hierarchy makes sense | Use heading navigation (VO+Cmd+H or H) | ☐ |
| **Main heading (H1) present** | Page has exactly one H1 | Navigate by headings | ☐ |
| **Landmarks present** | Main, navigation, banner, contentinfo landmarks | Use rotor/elements list | ☐ |
| **Form labels announced** | Label read when focusing input | Tab to input, listen for label | ☐ |
| **Required fields indicated** | "Required" or similar announced | Focus required field | ☐ |
| **Error messages announced** | Errors read when validation fails | Submit invalid form | ☐ |
| **Error summary focusable** | Focus moves to error summary | Submit invalid form | ☐ |
| **Error links descriptive** | Error text describes the problem | Listen to error summary | ☐ |
| **Links have descriptive text** | Link purpose clear from text alone | Navigate by links | ☐ |
| **Buttons have descriptive text** | Button purpose clear from text | Navigate by buttons | ☐ |
| **Images have alt text** | Alt text read for informative images | Navigate to images | ☐ |
| **Decorative images hidden** | Decorative images not announced | Check images are skipped | ☐ |
| **Tables have headers** | Table headers announced with cells | Navigate through table | ☐ |
| **Lists announced as lists** | "List with X items" announced | Navigate to lists | ☐ |
| **Status messages announced** | Dynamic updates announced | Trigger status message | ☐ |
| **Progress indicators announced** | Loading states communicated | Trigger loading state | ☐ |

### 2.5 GOV.UK Specific Requirements

| Test | Expected Behaviour | Pass/Fail |
|------|-------------------|-----------|
| **Phase banner announced** | "Alpha" or "Beta" banner read | ☐ |
| **Service name announced** | Service name in header read | ☐ |
| **Back link announced** | "Back" link present and announced | ☐ |
| **Error summary title** | "There is a problem" announced | ☐ |
| **Visually hidden text** | "Error:" prefix on inline errors | ☐ |

---

## 3. Zoom and Text Resize Testing

### 3.1 Browser Zoom Testing

| Test | Expected Behaviour | How to Test | Pass/Fail |
|------|-------------------|-------------|-----------|
| **200% zoom readable** | All content readable, no overlap | Set zoom to 200% (Cmd/Ctrl + +) | ☐ |
| **200% zoom no horizontal scroll** | No horizontal scrolling needed | Scroll vertically only | ☐ |
| **400% zoom usable** | Content still usable at 400% | Set zoom to 400% | ☐ |
| **Text doesn't overlap** | Text doesn't overlap at any zoom level | Check at 200%, 300%, 400% | ☐ |
| **Interactive elements accessible** | Can still click/tap all buttons | Test interactions at 200% | ☐ |
| **Forms still usable** | Can complete forms at 200% zoom | Fill and submit form | ☐ |

**Testing Procedure:**
1. Set browser zoom to 200% using `Cmd/Ctrl` + `+`
2. Navigate through the page
3. Verify all content is readable
4. Check no horizontal scrolling is required
5. Test form submission
6. Repeat at 400% zoom
7. Reset zoom with `Cmd/Ctrl` + `0`

### 3.2 Text-Only Zoom Testing

| Test | Expected Behaviour | How to Test | Pass/Fail |
|------|-------------------|-------------|-----------|
| **Text scales to 200%** | Text size doubles | Firefox: View > Zoom > Zoom Text Only | ☐ |
| **Layout adapts** | Layout reflows appropriately | Check layout at 200% text | ☐ |
| **No text truncation** | Text not cut off | Verify all text visible | ☐ |

### 3.3 Mobile Viewport Testing (320px)

| Test | Expected Behaviour | How to Test | Pass/Fail |
|------|-------------------|-------------|-----------|
| **No horizontal scroll** | Content fits in 320px width | Resize browser to 320px wide | ☐ |
| **Content reflows** | Content stacks vertically | Check layout at 320px | ☐ |
| **Touch targets 44x44px** | Buttons/links large enough | Verify button sizes | ☐ |

**Testing Procedure:**
1. Open browser DevTools (F12)
2. Toggle device toolbar (Cmd/Ctrl + Shift + M)
3. Set viewport to 320px width
4. Navigate through page
5. Verify no horizontal scrolling

---

## 4. Colour and Contrast Testing

### 4.1 Contrast Testing

| Test | Expected Behaviour | How to Test | Pass/Fail |
|------|-------------------|-------------|-----------|
| **Text contrast ≥ 4.5:1** | Normal text meets WCAG AA | Use contrast checker tool | ☐ |
| **Large text contrast ≥ 3:1** | 18pt+ or 14pt+ bold meets WCAG AA | Use contrast checker tool | ☐ |
| **Focus indicator visible** | 3:1 contrast minimum | Check focus ring contrast | ☐ |
| **UI component contrast ≥ 3:1** | Buttons, form borders visible | Check component contrast | ☐ |

**Tools:**
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Colour Contrast Analyser](https://www.tpgi.com/color-contrast-checker/)
- Browser DevTools Accessibility panel

**Testing Procedure:**
1. Open browser DevTools
2. Go to Accessibility panel
3. Inspect text elements
4. Verify contrast ratios meet requirements
5. Test focus indicators separately

### 4.2 Colour Independence Testing

| Test | Expected Behaviour | How to Test | Pass/Fail |
|------|-------------------|-------------|-----------|
| **Information not colour-only** | Shape, text, or icon also used | Check error states, status indicators | ☐ |
| **Error states have icons** | Errors shown with icon + colour | Submit invalid form | ☐ |
| **Links distinguishable** | Links underlined or otherwise distinct | Check link styling | ☐ |
| **Required fields marked** | Asterisk or text, not just colour | Check form labels | ☐ |

---

## 5. Motion and Animation Testing

### 5.1 Reduced Motion Testing

| Test | Expected Behaviour | How to Test | Pass/Fail |
|------|-------------------|-------------|-----------|
| **Reduced motion respected** | Animations disabled when preference set | Enable "Reduce motion" in OS | ☐ |
| **No auto-playing content** | Videos/animations don't auto-play | Check for auto-play | ☐ |
| **No flashing content** | No content flashes > 3 times/second | Check animations | ☐ |
| **Transitions still functional** | UI still works without animations | Test with reduced motion on | ☐ |

**Enable Reduced Motion:**
- **macOS:** System Preferences > Accessibility > Display > Reduce motion
- **Windows:** Settings > Ease of Access > Display > Show animations
- **Browser DevTools:** Rendering panel > Emulate CSS media feature prefers-reduced-motion

---

## 6. GOV.UK Frontend Component Testing

### 6.1 Error Summary Component

| Test | Expected Behaviour | Pass/Fail |
|------|-------------------|-----------|
| Error summary has `role="alert"` or `aria-live="assertive"` | ☐ |
| Error summary has `tabindex="-1"` | ☐ |
| Focus moves to error summary on validation | ☐ |
| Error summary title is "There is a problem" | ☐ |
| Each error links to relevant field | ☐ |
| Error links have descriptive text | ☐ |

### 6.2 Form Validation

| Test | Expected Behaviour | Pass/Fail |
|------|-------------------|-----------|
| Inline errors have `govuk-error-message` class | ☐ |
| Inline errors associated via `aria-describedby` | ☐ |
| Error text includes "Error:" visually hidden prefix | ☐ |
| Form group has `govuk-form-group--error` class | ☐ |
| Input has `govuk-input--error` class | ☐ |

### 6.3 Radios and Checkboxes

| Test | Expected Behaviour | Pass/Fail |
|------|-------------------|-----------|
| Fieldset wraps radio/checkbox group | ☐ |
| Legend describes the group | ☐ |
| Each input has associated label | ☐ |
| Hint text associated via `aria-describedby` | ☐ |
| Arrow keys navigate radio buttons | ☐ |

---

## 7. NestJS Journey Specific Tests

### 7.1 Journey Step Pages

Test each step of the NestJS journey (`/nest-journey/step1`, `/nest-journey/step2`, `/nest-journey/step3`):

| Test | Step 1 | Step 2 | Step 3 |
|------|--------|--------|--------|
| Page title unique and descriptive | ☐ | ☐ | ☐ |
| H1 heading present | ☐ | ☐ | ☐ |
| Back link present and works | ☐ | ☐ | ☐ |
| Form controls keyboard accessible | ☐ | ☐ | ☐ |
| Validation errors handled correctly | ☐ | ☐ | ☐ |
| Error summary receives focus | ☐ | ☐ | ☐ |
| Screen reader announces all content | ☐ | ☐ | ☐ |

### 7.2 Confirmation Page

| Test | Expected Behaviour | Pass/Fail |
|------|-------------------|-----------|
| Confirmation panel has green background | ☐ |
| Success message clearly announced | ☐ |
| "What happens next" section present | ☐ |
| No form controls on confirmation page | ☐ |

---

## 8. Reporting Issues

When reporting accessibility issues, include:

1. **Page/Component:** Where the issue occurs (URL or component name)
2. **Issue Description:** Clear description of the problem
3. **WCAG Criterion:** Which guideline is violated (e.g., 2.4.7 Focus Visible)
4. **Severity:** Critical, High, Medium, Low
5. **Impact:** Who is affected (keyboard users, screen reader users, etc.)
6. **Steps to Reproduce:** How to find the issue
7. **Suggested Fix:** If known
8. **Screenshots/Videos:** Visual evidence if applicable

**Example Issue Report:**

```
Page: /nest-journey/step1
Issue: Error summary not receiving focus on form submission
WCAG: 3.3.1 Error Identification (Level A)
Severity: High
Impact: Screen reader users not immediately informed of validation errors
Steps to Reproduce:
  1. Navigate to /nest-journey/step1
  2. Submit form without selecting an option
  3. Observe focus does not move to error summary
Suggested Fix: Add tabindex="-1" to error summary and call .focus() on validation
```

---

## 9. Testing Tools

### Browser Extensions

- **axe DevTools** (Chrome/Firefox): Automated accessibility testing
- **WAVE** (Chrome/Firefox): Visual accessibility evaluation
- **Lighthouse** (Chrome): Accessibility audit in DevTools
- **HeadingsMap** (Chrome/Firefox): Visualize heading structure

### Desktop Tools

- **Colour Contrast Analyser**: Check colour contrast ratios
- **NVDA** (Windows): Free screen reader
- **JAWS** (Windows): Professional screen reader (trial available)
- **VoiceOver** (macOS): Built-in screen reader

### Online Tools

- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [WAVE Web Accessibility Evaluation Tool](https://wave.webaim.org/)
- [HTML5 Outliner](https://gsnedders.html5.org/outliner/)

---

## 10. Resources

- [GOV.UK Accessibility Requirements](https://www.gov.uk/service-manual/helping-people-to-use-your-service/making-your-service-accessible-an-introduction)
- [WCAG 2.2 Quick Reference](https://www.w3.org/WAI/WCAG22/quickref/)
- [GOV.UK Design System Accessibility](https://design-system.service.gov.uk/accessibility/)
- [WebAIM Screen Reader Testing](https://webaim.org/articles/screenreader_testing/)
- [NVDA User Guide](https://www.nvaccess.org/files/nvda/documentation/userGuide.html)
- [VoiceOver User Guide](https://support.apple.com/guide/voiceover/welcome/mac)

---

## Appendix: Quick Reference Cards

### VoiceOver Quick Reference (macOS)

```
VO = Control + Option

Navigation:
  VO + A                    Read all
  VO + Right/Left Arrow     Next/Previous item
  VO + U                    Rotor menu
  VO + Command + H          Next heading
  VO + Command + J          Next form control
  VO + Command + L          Next link
  VO + Space                Activate

Control:
  Control                   Stop reading
  VO + Shift + Down Arrow   Interact with element
  VO + Shift + Up Arrow     Stop interacting
```

### NVDA Quick Reference (Windows)

```
Insert = NVDA key (or Caps Lock in laptop layout)

Navigation:
  Insert + Down Arrow       Read all
  H                         Next heading
  Shift + H                 Previous heading
  F                         Next form field
  K                         Next link
  B                         Next button
  Insert + F7               Elements list

Control:
  Control                   Stop reading
  Insert + Space            Focus/Browse mode toggle
  Insert + S                Speech mode toggle
```
