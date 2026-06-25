### Task 1: Fix connector line colors and junction gap

**Files:**
- Modify: `src/components/Bracket.css` — lines 59–92 (dark theme connectors) and lines 380–384 (light theme connectors)

**Interfaces:**
- Produces: Connector pseudo-elements use brighter color; `connector-bottom::after` has +2px height to close junction gap

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

  ```
  npm run build
  ```
  Expected: build completes with no errors. Output file `assets/js/bracket.bundle.js` is updated.

- [ ] **Step 5: Commit**

  ```
  git add src/components/Bracket.css
  git commit -m "fix: improve bracket connector line visibility and close junction gap"
  ```
