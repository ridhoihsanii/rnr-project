## Task 7: entry.jsx + Playwright Smoke Test

**Files:**
- Modify: `src/entry.jsx`
- Create: `tests/bracket-react.spec.js`

**Interfaces:**
- Consumes: `BracketPage` from `./components/BracketPage`; `bilpos:bracket-activated` custom event dispatched by nav click handler
- Produces: React app mounted to `#bracket-react-root`; Playwright tests validate bracket renders + interactions

- [ ] **Step 1: Replace `src/entry.jsx`**

```jsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import BracketPage from './components/BracketPage';

var _root = null;

function mountBracket() {
  var rootEl = document.getElementById('bracket-react-root');
  if (!rootEl) return;
  if (!_root) {
    _root = createRoot(rootEl);
  }
  _root.render(React.createElement(BracketPage));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountBracket);
} else {
  mountBracket();
}

// Fire bilpos:bracket-activated when the Bracket nav tab is clicked so
// BracketPage can re-read fresh participant data from BilposStorage.
document.addEventListener('DOMContentLoaded', function() {
  var navItem = document.querySelector('.sidebar-nav-item[data-section="bracket"]');
  if (navItem) {
    navItem.addEventListener('click', function() {
      window.dispatchEvent(new CustomEvent('bilpos:bracket-activated'));
    });
  }
});
```

- [ ] **Step 2: Run the build**

```
npm run build
```

Expected: exits 0. Files `assets/js/bracket.bundle.js` and `assets/js/bracket.bundle.css` updated.

- [ ] **Step 3: Create `tests/bracket-react.spec.js`**

```js
const { test, expect } = require('@playwright/test');

// Helper: set up localStorage with N participants and a given tournament size,
// then reload the page. The server must be running at http://127.0.0.1:8080.
async function setupBracket(page, size) {
  await page.goto('/index.html');
  await page.evaluate(function(sz) {
    var participants = [];
    for (var i = 1; i <= sz; i++) {
      participants.push({
        id: 'row-' + i,
        slot: i,
        name: 'Player ' + i,
        hc: 'HC 3B',
        hcCustom: '',
        status: '',
      });
    }
    localStorage.setItem('bilpos_tournament', JSON.stringify({ size: sz, status: 'setup', currentRound: 0 }));
    localStorage.setItem('bilpos_participants', JSON.stringify(participants));
    localStorage.removeItem('bilpos_bracket');
  }, size);
  await page.reload();
}

test.describe('React Bracket Module', () => {
  test('Bracket nav item is visible', async ({ page }) => {
    await page.goto('/index.html');
    await expect(page.locator('[data-section="bracket"]')).toBeVisible();
  });

  test('bracket section becomes active after clicking nav', async ({ page }) => {
    await setupBracket(page, 16);
    await page.click('[data-section="bracket"]');
    await expect(page.locator('#section-bracket')).toBeVisible();
  });

  test('renders bracket-view for 16 participants', async ({ page }) => {
    await setupBracket(page, 16);
    await page.click('[data-section="bracket"]');
    await page.waitForSelector('.bracket-view', { timeout: 8000 });
    await expect(page.locator('.bracket-view')).toBeVisible();
  });

  test('renders 4 round columns for 16 participants', async ({ page }) => {
    await setupBracket(page, 16);
    await page.click('[data-section="bracket"]');
    await page.waitForSelector('.round-column', { timeout: 8000 });
    const count = await page.locator('.round-column').count();
    expect(count).toBe(4); // log2(16) = 4 rounds
  });

  test('first round label is ROUND 1 and last is FINAL', async ({ page }) => {
    await setupBracket(page, 16);
    await page.click('[data-section="bracket"]');
    await page.waitForSelector('.round-label', { timeout: 8000 });
    const labels = await page.locator('.round-label').allTextContents();
    expect(labels[0]).toContain('ROUND 1');
    expect(labels[labels.length - 1]).toContain('FINAL');
  });

  test('round 1 match cards contain participant dropdowns', async ({ page }) => {
    await setupBracket(page, 16);
    await page.click('[data-section="bracket"]');
    await page.waitForSelector('.participant-select', { timeout: 8000 });
    const selectCount = await page.locator('.participant-select').count();
    // 8 matches Ã— 2 slots = 16 dropdowns in round 1
    expect(selectCount).toBeGreaterThanOrEqual(16);
  });

  test('participant dropdown options include HC label', async ({ page }) => {
    await setupBracket(page, 16);
    await page.click('[data-section="bracket"]');
    await page.waitForSelector('.participant-select', { timeout: 8000 });
    const firstSelect = page.locator('.participant-select').first();
    const options = await firstSelect.locator('option').allTextContents();
    const hasHc = options.some(function(o) { return o.includes('HC 3B'); });
    expect(hasHc).toBe(true);
  });

  test('LIVE button marks match card with live class', async ({ page }) => {
    await setupBracket(page, 16);
    await page.click('[data-section="bracket"]');
    await page.waitForSelector('.live-btn', { timeout: 8000 });
    await page.locator('.live-btn').first().click();
    await expect(page.locator('.match-card.live').first()).toBeVisible();
  });

  test('only one match is live at a time', async ({ page }) => {
    await setupBracket(page, 16);
    await page.click('[data-section="bracket"]');
    await page.waitForSelector('.live-btn', { timeout: 8000 });
    await page.locator('.live-btn').nth(0).click();
    await page.locator('.live-btn').nth(1).click();
    const liveCount = await page.locator('.match-card.live').count();
    expect(liveCount).toBe(1);
  });

  test('clicking active LIVE button deactivates it', async ({ page }) => {
    await setupBracket(page, 16);
    await page.click('[data-section="bracket"]');
    await page.waitForSelector('.live-btn', { timeout: 8000 });
    const btn = page.locator('.live-btn').first();
    await btn.click(); // activate
    await expect(page.locator('.match-card.live').first()).toBeVisible();
    await btn.click(); // deactivate
    const liveCount = await page.locator('.match-card.live').count();
    expect(liveCount).toBe(0);
  });

  test('entering scores shows WIN/LOSE badges', async ({ page }) => {
    await setupBracket(page, 16);
    await page.click('[data-section="bracket"]');
    await page.waitForSelector('.score-input', { timeout: 8000 });

    // Select two participants in the first match
    const selects = page.locator('.participant-select');
    await selects.nth(0).selectOption({ index: 1 }); // first available participant
    await selects.nth(1).selectOption({ index: 1 }); // first available (different due to dedup)

    // Enter scores
    const inputs = page.locator('.score-input');
    await inputs.nth(0).fill('7');
    await inputs.nth(1).fill('5');

    await expect(page.locator('.badge.win').first()).toBeVisible();
    await expect(page.locator('.badge.lose').first()).toBeVisible();
  });

  test('bracket state persists after page reload', async ({ page }) => {
    await setupBracket(page, 16);
    await page.click('[data-section="bracket"]');
    await page.waitForSelector('.live-btn', { timeout: 8000 });

    // Activate LIVE on first match
    await page.locator('.live-btn').first().click();
    await expect(page.locator('.match-card.live').first()).toBeVisible();

    // Reload
    await page.reload();
    await page.click('[data-section="bracket"]');
    await page.waitForSelector('.match-card.live', { timeout: 8000 });
    const liveCount = await page.locator('.match-card.live').count();
    expect(liveCount).toBe(1);
  });

  test('renders 7 round columns for 128 participants', async ({ page }) => {
    await setupBracket(page, 128);
    await page.click('[data-section="bracket"]');
    await page.waitForSelector('.round-column', { timeout: 10000 });
    const count = await page.locator('.round-column').count();
    expect(count).toBe(7); // log2(128) = 7 rounds
  });
});
```

- [ ] **Step 4: Start the dev server, then run the Playwright tests**

In one terminal (keep running):
```
npm start
```

In a second terminal:
```
npx playwright test tests/bracket-react.spec.js --reporter=list
```

Expected: 12 tests pass. Any failures will print the specific assertion that failed with a screenshot path in `test-results/`.

If the `score persistence` test or `winner badges` test fails due to timing, add a `await page.waitForTimeout(300)` after score inputs and re-run.

- [ ] **Step 5: Run all unit tests to confirm nothing broken**

```
node --test tests/bracket.test.js
node --test tests/tournament.test.js
node --test tests/bracket-react.test.js
```

Expected: all pass.

- [ ] **Step 6: Final build**

```
npm run build
```

Expected: exits 0.

- [ ] **Step 7: Commit**

```bash
git add src/entry.jsx tests/bracket-react.spec.js assets/js/bracket.bundle.js assets/js/bracket.bundle.css
git commit -m "feat: complete tournament bracket module with React, connectors, LIVE, persistence

- Challonge-style horizontal bracket with CSS pseudo-element L-shaped connectors
- Dynamic generation for 16/32/48/64/96/128 participants
- Round 1 participant dropdowns with HC label, duplicate prevention
- Automatic winner advancement with cascade clear on score change
- Single-active LIVE match with red pulse animation
- Full localStorage persistence via BilposStorage
- 12 Playwright E2E tests + 20 unit tests

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Self-Review Checklist

**Spec coverage:**

| Spec Requirement | Covered In |
|---|---|
| Horizontal bracket layout with connected lines | Task 3 (CSS), Task 5 (RoundColumn connector classes) |
| Single Elimination format | Task 4 (BracketPage uses BilposTournament.generateBracket) |
| Horizontal scrolling + responsive | Task 3 (overflow-x: auto, media queries) |
| Dynamic size: 16/32/48/64/96/128 | Task 4 (reads size from BilposStorage.loadTournament) |
| Round 1 participant dropdowns with HC display | Task 6 (ParticipantSlot), Task 2 (getParticipantLabel) |
| Duplicate prevention in Round 1 | Task 5 (usedInRound1 set in BracketView), Task 6 (ParticipantSlot filters) |
| Manual score input beside each participant | Task 6 (ScoreInput beside ParticipantSlot in MatchCard) |
| Automatic winner advancement | Task 4 (handleScoreChange â†’ BilposTournament.advanceWinner) |
| Score change recalculates winner | Task 4 (resolveWinner called on every score change) |
| Cascade clear on winner change | Task 4 (cascadeClearWinnerMut) |
| LIVE button per match | Task 6 (MatchCard live-btn) |
| Only one LIVE match at a time | Task 4 (handleToggleLive sets single liveMatchId) |
| LIVE deactivates on second click | Task 4 (toggle: `prev.liveMatchId === matchId ? null : matchId`) |
| LIVE blinking red animation | Task 3 (liveBlink keyframes on .match-card.live) |
| Match number display | Task 5 (RoundColumn computes matchOffset; MatchCard shows Match #N) |
| Winner highlight + loser dim | Task 3 (winner-slot border-left green, loser-slot opacity 0.6) |
| Preserve bracket state after refresh | Task 4 (loadInitialState reads BilposStorage.loadBracket on mount) |
| Sync state to localStorage | Task 4 (saveState called in every handler) |
| Modular components | Tasks 4â€“6 (7 focused files) |
| BYE auto-advance | Task 4 (BilposTournament.autoAdvanceByes after generateBracket) |
| Light theme support | Task 3 ([data-theme='light'] overrides) |
