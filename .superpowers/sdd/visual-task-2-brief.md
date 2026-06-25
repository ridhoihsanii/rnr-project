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
    min-width: 36px;        /* add this */
    text-align: center;     /* add this */
  }
  ```

- [ ] **Step 4: Fix `.score-input` right-pinning**

  Find the `.score-input` rule (line ~257–270). Add `margin-left: auto;` after `flex-shrink: 0;`:
  ```css
  .score-input {
    width: 40px;
    flex-shrink: 0;
    margin-left: auto;      /* add this */
    padding: 3px 2px;
    ...
  }
  ```

- [ ] **Step 5: Build and verify no errors**

  ```
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

  ```
  git add src/components/Bracket.css
  git commit -m "fix: fix match card font size and score alignment after match result"
  ```
