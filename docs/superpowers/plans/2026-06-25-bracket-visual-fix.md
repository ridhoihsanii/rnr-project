# Bracket Visual Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix bracket connector line visibility/gap and match card font/alignment inconsistencies via pure CSS edits in `Bracket.css`.

**Architecture:** All changes are in `src/components/Bracket.css`. No component or logic files are touched. After CSS edits, rebuild the React bundle with `npm run build` so the new CSS is included in `assets/js/bracket.bundle.js`.

**Tech Stack:** CSS, esbuild (`npm run build`)

## Global Constraints

- Only `src/components/Bracket.css` may be modified — no `.jsx`, `.js`, or other files
- Do NOT change any `#cbd5e1` occurrence that is NOT a connector pseudo-element (e.g. `participant-select border-color`, `score-input border-color` in light theme — leave those alone)
- Run `npm run build` after all CSS changes and verify no build errors
- Working directory for all commands: repo root `bilpos-project/`

---

### Task 1: Fix connector line colors and junction gap

**Files:**
- Modify: `src/components/Bracket.css` — lines 59–92 (dark theme connectors) and lines 380–384 (light theme connectors)

**Interfaces:**
- Produces: Connector pseudo-elements use brighter color; `connector-bottom::after` has `+2px` height to close junction gap

- [ ] **Step 1: Apply dark-theme connector color fix (3 occurrences)**

  Open `src/components/Bracket.css`. Make these three edits:

  **Edit 1** — `has-left-arm::before` background (line ~66):
  ```css
  /* BEFORE */
  background: rgba(55, 75, 100, 0.85);
  /* AFTER */
  background: rgba(100, 140, 180, 0.9);
  ```
  Context to find it: the rule `.match-wrapper.has-left-arm::before { ... }` (line ~59–68).

  **Edit 2** — `connector-top::after` border colors (line ~78–79):
  ```css
  /* BEFORE */
  border-top: 2px solid rgba(55, 75, 100, 0.85);
  border-right: 2px solid rgba(55, 75, 100, 0.85);
  /* AFTER */
  border-top: 2px solid rgba(100, 140, 180, 0.9);
  border-right: 2px solid rgba(100, 140, 180, 0.9);
  ```
  Context: rule `.match-wrapper.connector-top::after { ... }` (line ~71–80).

  **Edit 3** — `connector-bottom::after` border colors (line ~90–91):
  ```css
  /* BEFORE */
  border-bottom: 2px solid rgba(55, 75, 100, 0.85);
  border-right: 2px solid rgba(55, 75, 100, 0.85);
  /* AFTER */
  border-bottom: 2px solid rgba(100, 140, 180, 0.9);
  border-right: 2px solid rgba(100, 140, 180, 0.9);
  ```
  Context: rule `.match-wrapper.connector-bottom::after { ... }` (line ~83–92).

- [ ] **Step 2: Apply junction gap fix to `connector-bottom::after`**

  In the same `.match-wrapper.connector-bottom::after` rule, change the `height` line:
  ```css
  /* BEFORE */
  height: var(--connector-h, 54px);
  /* AFTER */
  height: calc(var(--connector-h, 54px) + 2px);
  ```

- [ ] **Step 3: Apply light-theme connector color fix**

  Find the light-theme block (line ~380–384):
  ```css
  [data-theme='light'] .match-wrapper.has-left-arm::before,
  [data-theme='light'] .match-wrapper.connector-top::after,
  [data-theme='light'] .match-wrapper.connector-bottom::after {
    border-color: #cbd5e1;
    background-color: #cbd5e1;
  }
  ```
  Change ONLY these two color values:
  ```css
  [data-theme='light'] .match-wrapper.has-left-arm::before,
  [data-theme='light'] .match-wrapper.connector-top::after,
  [data-theme='light'] .match-wrapper.connector-bottom::after {
    border-color: #8a9bb0;
    background-color: #8a9bb0;
  }
  ```
  Do NOT change any other `#cbd5e1` occurrences (lines ~358 and ~373 are for borders of inputs — leave those alone).

- [ ] **Step 4: Build and verify no errors**

  ```bash
  npm run build
  ```
  Expected: build completes with no errors. Output file `assets/js/bracket.bundle.js` is updated.

- [ ] **Step 5: Commit**

  ```bash
  git add src/components/Bracket.css
  git commit -m "fix: improve bracket connector line visibility and close junction gap"
  ```

---

### Task 2: Fix match card font size and score alignment

**Files:**
- Modify: `src/components/Bracket.css` — `.participant-label` (~line 221–233), `.participant-name` (~line 235–244), `.badge` (~line 286–294), `.score-input` (~line 257–270)

**Interfaces:**
- Consumes: Task 1 completed (connector fixes in place)
- Produces: Uniform 10px font in match cards; `.badge` has fixed `min-width`; `.score-input` has `margin-left: auto`

- [ ] **Step 1: Fix `.participant-label` font size**

  Find the `.participant-label` rule (line ~221–233). Change `font-size`:
  ```css
  /* BEFORE */
  font-size: 11px;
  /* AFTER */
  font-size: 10px;
  ```

- [ ] **Step 2: Fix `.participant-name` font size**

  Find the `.participant-name` rule (line ~235–244). Change `font-size`:
  ```css
  /* BEFORE */
  font-size: 11px;
  /* AFTER */
  font-size: 10px;
  ```

- [ ] **Step 3: Fix `.badge` width consistency**

  Find the `.badge` rule (line ~286–294). Add two new properties after `text-transform: uppercase;`:
  ```css
  .badge {
    flex-shrink: 0;
    font-size: 8px;
    font-weight: 700;
    padding: 2px 5px;
    border-radius: 4px;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    min-width: 36px;        /* ← add */
    text-align: center;     /* ← add */
  }
  ```

- [ ] **Step 4: Fix `.score-input` right-pinning**

  Find the `.score-input` rule (line ~257–270). Add `margin-left: auto;` after `flex-shrink: 0;`:
  ```css
  .score-input {
    width: 40px;
    flex-shrink: 0;
    margin-left: auto;      /* ← add */
    padding: 3px 2px;
    ...
  }
  ```

- [ ] **Step 5: Build and verify no errors**

  ```bash
  npm run build
  ```
  Expected: build completes with no errors.

- [ ] **Step 6: Visual verification checklist**

  Open the app in a browser and check all 4 points:
  1. Connector lines clearly visible on dark background (tournament sizes 4, 8, 16, 32)
  2. No 1px gap at junction between top/bottom connector arms (bottom-half matches)
  3. P1 and P2 score inputs vertically aligned inside round 2+ match cards (after a match result is entered)
  4. Font sizes for participant names/labels look uniform (no bigger text for name vs dropdown)

- [ ] **Step 7: Commit**

  ```bash
  git add src/components/Bracket.css
  git commit -m "fix: fix match card font size and score alignment after match result"
  ```
