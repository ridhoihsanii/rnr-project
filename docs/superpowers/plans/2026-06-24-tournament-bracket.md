# Tournament Bracket Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete Challonge-style horizontal single-elimination tournament bracket in React, integrated as a new "Bracket" section in the existing BILPOS SPA.

**Architecture:** A `BracketPage` React component (state owner) reads tournament size and participants from `window.BilposStorage`, generates bracket data via `window.BilposTournament.generateBracket()`, renders a horizontally-scrollable `BracketView` of `RoundColumn` components each containing `MatchCard` components. CSS pseudo-element L-shaped lines connect sibling matches across rounds. All state is persisted to localStorage on every change.

**Tech Stack:** React 18, esbuild (already configured), CSS custom properties (`--connector-h`), Node.js built-in test runner, Playwright E2E.

## Global Constraints

- React 18.2.0 â€” no upgrade
- esbuild 0.19.x â€” build command: `npm run build` (from project root)
- All files in `src/components/` use `.jsx` extension; pure-logic utilities use `.js`
- CSS class naming: `bracket-view`, `round-column`, `match-wrapper`, `match-card`, `match-slot`, `participant-select`, `participant-label`, `score-input`, `live-btn`, `badge`
- `window.BilposStorage` and `window.BilposTournament` are globals â€” never import them
- Storage key for bracket: `bilpos_bracket` â€” value shape: `{ bracket: {...}, liveMatchId: string|null }`
- Participant shape: `{ id, name, hc, hcCustom, slot, status }` â€” `hc` is the preset value (e.g. `"HC 3B"`), `hcCustom` is the override string
- CARD_HEIGHT = 100 (px), CARD_GAP = 8 (px), ROUND_GAP = 48 (px), ARM_LENGTH = 24 (px = ROUND_GAP / 2)
- Do NOT break existing `tests/bracket.test.js` or `tests/tournament.test.js` â€” those test `assets/js/bracket.js` and `assets/js/tournament.js` which are not modified
- Run unit tests: `node --test tests/<file>.test.js`
- Run build: `npm run build` (from project root)

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `index.html` | Modify | Add Bracket nav item, section, script + CSS link tags |
| `src/entry.jsx` | Modify | Mount `BracketPage`; re-render on bracket nav click |
| `src/components/bracketUtils.js` | Create | Pure logic: HC labels, match spacing, winner resolution, cascade clear |
| `src/components/BracketPage.jsx` | Modify (replace) | State owner: bracket + liveMatchId; storage sync; all callbacks |
| `src/components/BracketView.jsx` | Create | Horizontal scroll container; renders RoundColumn list; computes usedInRound1 |
| `src/components/RoundColumn.jsx` | Create | Round label + match wrappers with JS-computed margin + connector classes |
| `src/components/MatchCard.jsx` | Create | Match card: LIVE btn, two ParticipantSlots, two ScoreInputs, badges |
| `src/components/ParticipantSlot.jsx` | Create | Dropdown (Round 1) or read-only text (Round 2+) or BYE label |
| `src/components/ScoreInput.jsx` | Create | Controlled `<input type="number">` |
| `src/components/Bracket.css` | Modify (replace) | All bracket styles: layout, connectors, cards, animations, responsive |
| `tests/bracket-react.test.js` | Create | Node.js unit tests for bracketUtils.js pure functions |
| `tests/bracket-react.spec.js` | Create | Playwright E2E tests for bracket UI |

---

## Task 1: HTML Integration

**Files:**
- Modify: `index.html`

**Interfaces:**
- Produces: `#section-bracket` section with `#bracket-react-root` div; `[data-section="bracket"]` nav item; `bracket.bundle.js` script; `bracket.bundle.css` link

- [ ] **Step 1: Add Bracket nav item to the top taskbar**

Open `index.html` and find the `<nav class="top-taskbar">` block (lines ~26-30). Add the Bracket item after the existing three items:

```html
<div class="sidebar-nav-item" data-section="bracket">
  <i class="fas fa-sitemap"></i> Bracket
</div>
```

The full `<nav>` block should look like:
```html
<nav class="top-taskbar">
  <div class="sidebar-nav-item" data-section="dashboard">Dashboard</div>
  <div class="sidebar-nav-item" data-section="setup">Tournament Setup</div>
  <div class="sidebar-nav-item" data-section="participants">List Peserta Bilpos</div>
  <div class="sidebar-nav-item" data-section="bracket">
    <i class="fas fa-sitemap"></i> Bracket
  </div>
</nav>
```

- [ ] **Step 2: Add the bracket section inside `<main>`**

In `index.html`, find the closing `</section>` of `section-participants` (around line ~169). Add the new section immediately after it, before the `<footer>`:

```html
<section class="RNR INTAN-section" id="section-bracket">
  <div class="section-header">
    <div class="section-title">
      <i class="fas fa-sitemap"></i>
      Tournament Bracket
    </div>
  </div>
  <div id="bracket-react-root"></div>
</section>
```

- [ ] **Step 3: Add the CSS link and JS script**

In `index.html`, inside `<head>`, add after the existing `<link rel="stylesheet" href="assets/css/style.css">` line:
```html
<link rel="stylesheet" href="assets/js/bracket.bundle.css">
```

At the bottom of `<body>`, after `<script src="assets/js/app.js"></script>`, add:
```html
<script src="assets/js/bracket.bundle.js"></script>
```

- [ ] **Step 4: Verify HTML is valid**

Run:
```
node -e "const fs = require('fs'); const html = fs.readFileSync('index.html','utf8'); ['section-bracket','bracket-react-root','data-section=\"bracket\"','bracket.bundle.js','bracket.bundle.css'].forEach(s => { if (!html.includes(s)) throw new Error('Missing: ' + s); }); console.log('HTML checks passed');"
```

Expected output: `HTML checks passed`

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat: add bracket section and nav item to index.html"
```

---

## Task 2: Bracket Logic Utilities (TDD)

**Files:**
- Create: `src/components/bracketUtils.js`
- Create: `tests/bracket-react.test.js`

**Interfaces:**
- Produces (for other components to import):
  - `const CARD_HEIGHT = 100` â€” number
  - `const CARD_GAP = 8` â€” number
  - `const ROUND_GAP = 48` â€” number
  - `const ARM_LENGTH = 24` â€” number
  - `getHcLabel(p)` â†’ `string` â€” converts `{ hc, hcCustom }` to display string
  - `getParticipantLabel(p)` â†’ `string` â€” `"Name - HC label"` or just `"Name"`
  - `computeMatchMargins(roundIdx, matchIdx)` â†’ `{ marginTop: number }` â€” px values for flex spacing
  - `computeConnectorHeight(roundIdx)` â†’ `number` â€” height in px of the vertical connector line
  - `resolveWinner(match)` â†’ `participant | null` â€” returns p1 or p2 based on scores, null if tied/incomplete

- [ ] **Step 1: Write the failing test file**

Create `tests/bracket-react.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const utils = require(path.join(process.cwd(), 'src', 'components', 'bracketUtils.js'));

// â”€â”€ getHcLabel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
test('getHcLabel returns preset hc value', () => {
  assert.equal(utils.getHcLabel({ hc: 'HC 3B', hcCustom: '' }), 'HC 3B');
});

test('getHcLabel returns custom hc when hcCustom is set', () => {
  assert.equal(utils.getHcLabel({ hc: 'custom', hcCustom: 'HC 5A' }), 'HC 5A');
});

test('getHcLabel returns hcCustom even when hc is a preset', () => {
  assert.equal(utils.getHcLabel({ hc: 'HC 3N', hcCustom: 'SPECIAL' }), 'SPECIAL');
});

test('getHcLabel returns empty string for null participant', () => {
  assert.equal(utils.getHcLabel(null), '');
});

test('getHcLabel returns empty string when both hc and hcCustom are empty', () => {
  assert.equal(utils.getHcLabel({ hc: '', hcCustom: '' }), '');
});

// â”€â”€ getParticipantLabel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
test('getParticipantLabel formats name and HC', () => {
  assert.equal(utils.getParticipantLabel({ name: 'Ihsan', hc: 'HC 3B', hcCustom: '' }), 'Ihsan - HC 3B');
});

test('getParticipantLabel returns name only when no HC', () => {
  assert.equal(utils.getParticipantLabel({ name: 'Budi', hc: '', hcCustom: '' }), 'Budi');
});

test('getParticipantLabel returns empty string for null', () => {
  assert.equal(utils.getParticipantLabel(null), '');
});

// â”€â”€ computeMatchMargins â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
test('computeMatchMargins roundIdx=0 matchIdx=0 returns correct offset', () => {
  // step(0) = (100+8)*1 = 108; offset = 108/2 - 50 = 4
  const { marginTop } = utils.computeMatchMargins(0, 0);
  assert.equal(marginTop, 4);
});

test('computeMatchMargins roundIdx=0 matchIdx=1 returns gap between cards', () => {
  // marginTop for non-first = step - CARD_HEIGHT = 108 - 100 = 8
  const { marginTop } = utils.computeMatchMargins(0, 1);
  assert.equal(marginTop, 8);
});

test('computeMatchMargins roundIdx=1 matchIdx=0 returns correct offset', () => {
  // step(1) = 108*2 = 216; offset = 216/2 - 50 = 58
  const { marginTop } = utils.computeMatchMargins(1, 0);
  assert.equal(marginTop, 58);
});

test('computeMatchMargins roundIdx=1 matchIdx=1 returns gap', () => {
  // step(1) - CARD_HEIGHT = 216 - 100 = 116
  const { marginTop } = utils.computeMatchMargins(1, 1);
  assert.equal(marginTop, 116);
});

// â”€â”€ computeConnectorHeight â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
test('computeConnectorHeight round 0 is step/2', () => {
  // step(0)=108, connector=54
  assert.equal(utils.computeConnectorHeight(0), 54);
});

test('computeConnectorHeight round 1 is double round 0', () => {
  assert.equal(utils.computeConnectorHeight(1), 108);
});

test('computeConnectorHeight round 2 is quadruple round 0', () => {
  assert.equal(utils.computeConnectorHeight(2), 216);
});

// â”€â”€ resolveWinner â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
test('resolveWinner returns p1 when score1 > score2', () => {
  const p1 = { id: 'a', name: 'Alice' };
  const p2 = { id: 'b', name: 'Bob' };
  const winner = utils.resolveWinner({ p1, p2, score1: 7, score2: 5 });
  assert.equal(winner, p1);
});

test('resolveWinner returns p2 when score2 > score1', () => {
  const p1 = { id: 'a', name: 'Alice' };
  const p2 = { id: 'b', name: 'Bob' };
  const winner = utils.resolveWinner({ p1, p2, score1: 3, score2: 9 });
  assert.equal(winner, p2);
});

test('resolveWinner returns null when scores are equal', () => {
  const p1 = { id: 'a', name: 'Alice' };
  const p2 = { id: 'b', name: 'Bob' };
  assert.equal(utils.resolveWinner({ p1, p2, score1: 5, score2: 5 }), null);
});

test('resolveWinner returns null when score1 is empty string', () => {
  const p1 = { id: 'a', name: 'Alice' };
  const p2 = { id: 'b', name: 'Bob' };
  assert.equal(utils.resolveWinner({ p1, p2, score1: '', score2: 5 }), null);
});

test('resolveWinner returns null when score2 is null', () => {
  const p1 = { id: 'a', name: 'Alice' };
  const p2 = { id: 'b', name: 'Bob' };
  assert.equal(utils.resolveWinner({ p1, p2, score1: 5, score2: null }), null);
});

test('resolveWinner returns null for null match', () => {
  assert.equal(utils.resolveWinner(null), null);
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```
node --test tests/bracket-react.test.js
```

Expected: `Error: Cannot find module '...bracketUtils.js'` â€” confirms the test correctly fails before implementation.

- [ ] **Step 3: Create `src/components/bracketUtils.js`**

```js
// src/components/bracketUtils.js
// Pure logic utilities for the React bracket module.
// Uses CommonJS exports so Node.js tests can require() directly.

const CARD_HEIGHT = 100;
const CARD_GAP    = 8;
const ROUND_GAP   = 48;
const ARM_LENGTH  = 24; // = ROUND_GAP / 2

function getHcLabel(p) {
  if (!p) return '';
  const custom = String(p.hcCustom || '').trim();
  const hc     = String(p.hc     || '').trim();
  if (hc === 'custom' || custom) return custom || hc;
  return hc;
}

function getParticipantLabel(p) {
  if (!p || !p.name) return '';
  const hc = getHcLabel(p);
  return hc ? p.name + ' - ' + hc : p.name;
}

// Returns { marginTop: number } â€” apply as inline style on .match-wrapper
function computeMatchMargins(roundIdx, matchIdx) {
  var step   = (CARD_HEIGHT + CARD_GAP) * Math.pow(2, roundIdx);
  var offset = step / 2 - CARD_HEIGHT / 2;
  return { marginTop: matchIdx === 0 ? offset : step - CARD_HEIGHT };
}

// Returns the height in px of the vertical connector pseudo-element
function computeConnectorHeight(roundIdx) {
  var step = (CARD_HEIGHT + CARD_GAP) * Math.pow(2, roundIdx);
  return step / 2;
}

// Returns the winning participant or null
// Null if either score is empty/null, or if scores are equal
function resolveWinner(match) {
  if (!match) return null;
  var s1 = match.score1;
  var s2 = match.score2;
  if (s1 === '' || s1 == null || s2 === '' || s2 == null) return null;
  var n1 = Number(s1);
  var n2 = Number(s2);
  if (n1 === n2) return null;
  return n1 > n2 ? match.p1 : match.p2;
}

module.exports = {
  CARD_HEIGHT,
  CARD_GAP,
  ROUND_GAP,
  ARM_LENGTH,
  getHcLabel,
  getParticipantLabel,
  computeMatchMargins,
  computeConnectorHeight,
  resolveWinner,
};
```

- [ ] **Step 4: Run the tests to confirm they pass**

```
node --test tests/bracket-react.test.js
```

Expected: all 20 tests pass, `â–¶ bracket-react` suite shows `pass 20`.

- [ ] **Step 5: Commit**

```bash
git add src/components/bracketUtils.js tests/bracket-react.test.js
git commit -m "feat: add bracketUtils pure logic + unit tests"
```

---

## Task 3: Bracket.css

**Files:**
- Modify (replace): `src/components/Bracket.css`

**Interfaces:**
- Produces CSS classes consumed by all bracket React components
- Key classes: `.bracket-view`, `.round-column`, `.round-label`, `.match-wrapper`, `.match-wrapper.connector-top`, `.match-wrapper.connector-bottom`, `.match-wrapper.has-left-arm`, `.match-card`, `.match-card.live`, `.match-header`, `.match-number`, `.live-btn`, `.live-btn.active`, `.match-slot`, `.match-slot.winner-slot`, `.match-slot.loser-slot`, `.participant-select`, `.participant-label`, `.participant-label.tbd`, `.participant-label.bye`, `.score-input`, `.badge.win`, `.badge.lose`, `.bracket-empty`

- [ ] **Step 1: Replace the full contents of `src/components/Bracket.css`**

```css
/* ================================================================
   RNR INTAN Tournament Bracket â€” React Component Styles
   Constants (must match bracketUtils.js): CARD_HEIGHT=100px, CARD_GAP=8px,
   ROUND_GAP=48px, ARM_LENGTH=24px
   ================================================================ */

/* â”€â”€ Horizontal scroll container â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
.bracket-view {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  overflow-x: auto;
  overflow-y: visible;
  gap: 48px; /* = ROUND_GAP */
  padding: 24px 32px 64px;
  min-height: 200px;
  -webkit-overflow-scrolling: touch;
}

/* â”€â”€ Round column â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
.round-column {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  width: 260px;
  overflow: visible;
}

.round-label {
  text-align: center;
  font-weight: 700;
  font-size: 10px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: #FACC15;
  margin-bottom: 12px;
  padding: 4px 8px;
  background: rgba(250, 204, 21, 0.07);
  border-radius: 6px;
  white-space: nowrap;
}

/* â”€â”€ Match wrapper (position anchor for connector lines) â”€â”€â”€â”€â”€â”€â”€ */
.match-wrapper {
  position: relative;
  overflow: visible;
  width: 260px;
}

/* Left arm: midpoint of gap â†’ left edge of card (round 2+) */
.match-wrapper.has-left-arm::before {
  content: '';
  position: absolute;
  top: 50%;
  left: -24px; /* = -ARM_LENGTH */
  width: 24px;
  height: 2px;
  background: rgba(55, 75, 100, 0.85);
  transform: translateY(-50%);
}

/* Right arm + vertical going DOWN (even match, non-final round) */
.match-wrapper.connector-top::after {
  content: '';
  position: absolute;
  top: 50%; /* card vertical center */
  right: -24px; /* right edge of arm starts at card.right */
  width: 24px; /* = ARM_LENGTH */
  height: var(--connector-h, 54px);
  border-top: 2px solid rgba(55, 75, 100, 0.85);
  border-right: 2px solid rgba(55, 75, 100, 0.85);
}

/* Right arm + vertical going UP (odd match, non-final round) */
.match-wrapper.connector-bottom::after {
  content: '';
  position: absolute;
  bottom: 50%; /* card vertical center */
  right: -24px;
  width: 24px;
  height: var(--connector-h, 54px);
  border-bottom: 2px solid rgba(55, 75, 100, 0.85);
  border-right: 2px solid rgba(55, 75, 100, 0.85);
}

/* â”€â”€ Match card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
.match-card {
  width: 260px;
  height: 100px; /* = CARD_HEIGHT â€” must match bracketUtils.CARD_HEIGHT */
  background: linear-gradient(135deg, #0d1b2a 0%, #0a1520 100%);
  border-radius: 10px;
  border: 1.5px solid rgba(255, 255, 255, 0.06);
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  transition: border-color 0.2s ease;
  box-sizing: border-box;
}

.match-card:hover {
  border-color: rgba(250, 204, 21, 0.2);
}

/* â”€â”€ LIVE blinking animation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
.match-card.live {
  animation: liveBlink 1s ease-in-out infinite;
}

@keyframes liveBlink {
  0%,
  100% {
    border-color: rgba(255, 23, 68, 0.2);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  }
  50% {
    border-color: #ff1744;
    box-shadow: 0 0 16px 4px rgba(255, 23, 68, 0.35);
  }
}

/* â”€â”€ Match header row â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
.match-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.match-number {
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.5px;
  color: #4a6080;
  text-transform: uppercase;
}

/* â”€â”€ LIVE button â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
.live-btn {
  font-size: 9px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 4px;
  background: rgba(255, 82, 82, 0.12);
  color: #ff5252;
  border: 1px solid rgba(255, 82, 82, 0.3);
  cursor: pointer;
  letter-spacing: 0.5px;
  transition: background 0.15s ease, color 0.15s ease;
  line-height: 1.4;
}

.live-btn:hover:not(:disabled) {
  background: rgba(255, 82, 82, 0.28);
}

.live-btn.active {
  background: #ff1744;
  color: #fff;
  border-color: #ff1744;
}

.live-btn:disabled {
  opacity: 0.3;
  cursor: default;
}

/* â”€â”€ Participant slot row â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
.match-slot {
  display: flex;
  align-items: center;
  gap: 5px;
  flex: 1;
  min-height: 28px;
  padding-left: 5px;
  border-left: 3px solid transparent;
  border-radius: 3px;
  transition: border-color 0.2s ease, background 0.2s ease;
}

.match-slot.winner-slot {
  border-left-color: #22c55e;
  background: rgba(34, 197, 94, 0.04);
}

.match-slot.loser-slot {
  opacity: 0.6;
  border-left-color: rgba(239, 68, 68, 0.25);
}

/* â”€â”€ Participant display â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
.participant-select {
  flex: 1;
  min-width: 0;
  padding: 3px 6px;
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.05);
  color: #e2e8f0;
  border: 1px solid rgba(255, 255, 255, 0.1);
  font-size: 10px;
  cursor: pointer;
  outline: none;
  font-family: inherit;
}

.participant-select:focus {
  border-color: rgba(250, 204, 21, 0.4);
}

.participant-label {
  flex: 1;
  min-width: 0;
  font-size: 11px;
  font-weight: 500;
  color: #e2e8f0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.participant-label.tbd {
  color: #3a4f65;
  font-style: italic;
}

.participant-label.bye {
  color: #3a4f65;
  font-style: italic;
}

/* â”€â”€ Score input â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
.score-input {
  width: 40px;
  flex-shrink: 0;
  padding: 3px 2px;
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.07);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.1);
  font-size: 12px;
  font-weight: 700;
  text-align: center;
  outline: none;
  font-family: inherit;
}

.score-input:focus {
  border-color: rgba(250, 204, 21, 0.5);
}

/* hide browser spin buttons */
.score-input::-webkit-inner-spin-button,
.score-input::-webkit-outer-spin-button {
  -webkit-appearance: none;
}
.score-input[type='number'] {
  -moz-appearance: textfield;
}

/* â”€â”€ WIN / LOSE badges â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
.badge {
  flex-shrink: 0;
  font-size: 8px;
  font-weight: 700;
  padding: 2px 5px;
  border-radius: 4px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.badge.win {
  background: rgba(34, 197, 94, 0.18);
  color: #22c55e;
  border: 1px solid rgba(34, 197, 94, 0.3);
}

.badge.lose {
  background: rgba(239, 68, 68, 0.12);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.2);
}

/* â”€â”€ Empty state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
.bracket-empty {
  text-align: center;
  padding: 64px 24px;
  color: #4a6080;
}

.bracket-empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.bracket-empty p {
  font-size: 14px;
}

/* â”€â”€ Responsive â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
@media (max-width: 767px) {
  .bracket-view {
    padding: 16px;
    gap: 36px;
  }

  /* Shrink arm to match smaller gap */
  .match-wrapper.has-left-arm::before { left: -18px; width: 18px; }
  .match-wrapper.connector-top::after,
  .match-wrapper.connector-bottom::after { right: -18px; width: 18px; }

  .round-column  { width: 220px; }
  .match-card    { width: 220px; }
  .score-input   { width: 36px; }
  .participant-select,
  .participant-label { font-size: 9px; }
}

/* â”€â”€ Light theme overrides â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
[data-theme='light'] .match-card {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-color: #e2e8f0;
  color: #0f172a;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

[data-theme='light'] .match-card:hover {
  border-color: rgba(250, 204, 21, 0.5);
}

[data-theme='light'] .participant-select {
  background: #fff;
  color: #0f172a;
  border-color: #cbd5e1;
}

[data-theme='light'] .participant-label {
  color: #1e293b;
}

[data-theme='light'] .participant-label.tbd,
[data-theme='light'] .participant-label.bye {
  color: #94a3b8;
}

[data-theme='light'] .score-input {
  background: #fff;
  color: #0f172a;
  border-color: #cbd5e1;
}

[data-theme='light'] .match-number {
  color: #94a3b8;
}

[data-theme='light'] .match-wrapper.has-left-arm::before,
[data-theme='light'] .match-wrapper.connector-top::after,
[data-theme='light'] .match-wrapper.connector-bottom::after {
  border-color: #cbd5e1;
  background-color: #cbd5e1;
}

[data-theme='light'] .round-label {
  background: rgba(250, 204, 21, 0.12);
}
```

- [ ] **Step 2: Run the build to verify CSS compiles without errors**

```
npm run build
```

Expected: exits with code 0. Output: `assets/js/bracket.bundle.js` and `assets/js/bracket.bundle.css` regenerated.

- [ ] **Step 3: Commit**

```bash
git add src/components/Bracket.css
git commit -m "feat: add Challonge-style bracket CSS with pseudo-element connectors"
```

---

## Task 4: BracketPage.jsx (State Owner)

**Files:**
- Modify (replace): `src/components/BracketPage.jsx`

**Interfaces:**
- Consumes: `window.BilposStorage` (loadTournament, loadParticipants, loadBracket, saveBracket), `window.BilposTournament` (generateBracket, autoAdvanceByes, advanceWinner), `resolveWinner` from `./bracketUtils`
- Produces: renders `<BracketView>` with props: `bracket`, `participants`, `liveMatchId`, `onScoreChange(roundIdx, matchIdx, slot, rawValue)`, `onSelectParticipant(roundIdx, matchIdx, slot, participantId)`, `onToggleLive(matchId)`

- [ ] **Step 1: Replace `src/components/BracketPage.jsx` completely**

```jsx
import React, { useState, useEffect, useCallback } from 'react';
import BracketView from './BracketView';
import { resolveWinner } from './bracketUtils';

// Mutating cascade-clear for use on already-deepCloned brackets.
// Clears the slot populated by match (roundIdx, matchIdx) and recurses
// if the parent match also had a determined winner.
function cascadeClearWinnerMut(bracket, roundIdx, matchIdx) {
  var nextRoundIdx = roundIdx + 1;
  if (nextRoundIdx >= bracket.rounds.length) return;

  var nextMatchIdx = Math.floor(matchIdx / 2);
  var slot = matchIdx % 2 === 0 ? 'p1' : 'p2';
  var parentMatch = bracket.rounds[nextRoundIdx][nextMatchIdx];

  if (!parentMatch || !parentMatch[slot]) return;

  var hadWinner = parentMatch.winner;
  parentMatch[slot]    = null;
  parentMatch.score1   = '';
  parentMatch.score2   = '';
  parentMatch.winner   = null;
  parentMatch.status   = 'pending';

  if (hadWinner) {
    cascadeClearWinnerMut(bracket, nextRoundIdx, nextMatchIdx);
  }
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function loadInitialState() {
  var storage      = window.BilposStorage;
  var tournament_  = (storage && storage.loadTournament())  || { size: 32 };
  var participants = (storage && storage.loadParticipants()) || [];
  var saved        = storage && storage.loadBracket();

  var bracket;
  var liveMatchId = null;
  var size = parseInt(tournament_.size, 10) || 32;

  if (saved && saved.bracket && saved.bracket.size === size) {
    bracket     = saved.bracket;
    liveMatchId = saved.liveMatchId || null;
  } else {
    var filtered = participants.filter(function(p) { return p && p.name && p.name.trim(); });
    bracket = window.BilposTournament
      ? window.BilposTournament.generateBracket(size, filtered)
      : { rounds: [], size: size, generatedAt: Date.now() };
    if (window.BilposTournament) {
      window.BilposTournament.autoAdvanceByes(bracket);
    }
  }

  return { bracket: bracket, liveMatchId: liveMatchId, participants: participants };
}

export default function BracketPage() {
  var [state, setState] = useState(loadInitialState);

  // Re-read storage when participants/tournament storage keys change
  useEffect(function() {
    function onStorage(e) {
      if (e.key === 'RNR INTAN_participants' || e.key === 'RNR INTAN_tournament') {
        setState(loadInitialState());
      }
    }
    window.addEventListener('storage', onStorage);
    return function() { window.removeEventListener('storage', onStorage); };
  }, []);

  // Re-read storage when bracket nav tab is clicked (bilpos:bracket-activated event)
  useEffect(function() {
    function onActivated() { setState(loadInitialState()); }
    window.addEventListener('RNR INTAN:bracket-activated', onActivated);
    return function() { window.removeEventListener('RNR INTAN:bracket-activated', onActivated); };
  }, []);

  var saveState = useCallback(function(newBracket, newLiveMatchId) {
    if (window.BilposStorage) {
      window.BilposStorage.saveBracket({ bracket: newBracket, liveMatchId: newLiveMatchId });
    }
  }, []);

  var handleScoreChange = useCallback(function(roundIdx, matchIdx, slot, rawValue) {
    setState(function(prev) {
      var newBracket  = deepClone(prev.bracket);
      var scoreKey    = slot === 1 ? 'score1' : 'score2';
      var value       = rawValue === '' ? '' : Number(rawValue);
      var match       = newBracket.rounds[roundIdx][matchIdx];
      var prevWinner  = match.winner;

      match[scoreKey] = value;

      var newWinner = resolveWinner(match);
      match.winner  = newWinner;
      match.status  = newWinner ? 'done' : 'pending';

      var winnerChanged = (newWinner && prevWinner && String(newWinner.id) !== String(prevWinner.id))
                       || (newWinner && !prevWinner)
                       || (!newWinner && prevWinner);

      if (winnerChanged) {
        // Clear any previously-advanced participant first
        if (prevWinner) {
          cascadeClearWinnerMut(newBracket, roundIdx, matchIdx);
        }
        // Advance the new winner (or nothing if newWinner is null)
        if (newWinner && window.BilposTournament) {
          window.BilposTournament.advanceWinner(newBracket, roundIdx, matchIdx, newWinner);
        }
      }

      saveState(newBracket, prev.liveMatchId);
      return { bracket: newBracket, liveMatchId: prev.liveMatchId, participants: prev.participants };
    });
  }, [saveState]);

  var handleSelectParticipant = useCallback(function(roundIdx, matchIdx, slot, participantId) {
    setState(function(prev) {
      var newBracket  = deepClone(prev.bracket);
      var key         = slot === 1 ? 'p1' : 'p2';
      var participant = participantId
        ? (prev.participants.find(function(p) { return String(p.id) === String(participantId); }) || null)
        : null;

      var match   = newBracket.rounds[roundIdx][matchIdx];
      match[key]  = participant;
      match.score1 = '';
      match.score2 = '';
      match.winner = null;
      match.status = 'pending';

      saveState(newBracket, prev.liveMatchId);
      return { bracket: newBracket, liveMatchId: prev.liveMatchId, participants: prev.participants };
    });
  }, [saveState]);

  var handleToggleLive = useCallback(function(matchId) {
    setState(function(prev) {
      var newLiveMatchId = prev.liveMatchId === matchId ? null : matchId;
      saveState(prev.bracket, newLiveMatchId);
      return { bracket: prev.bracket, liveMatchId: newLiveMatchId, participants: prev.participants };
    });
  }, [saveState]);

  if (!state.bracket || !state.bracket.rounds || state.bracket.rounds.length === 0) {
    return (
      <div className="bracket-empty">
        <div className="bracket-empty-icon">ðŸ†</div>
        <p>Setup tournament terlebih dahulu dan tambahkan peserta di menu Tournament Setup.</p>
      </div>
    );
  }

  return (
    <BracketView
      bracket={state.bracket}
      participants={state.participants}
      liveMatchId={state.liveMatchId}
      onScoreChange={handleScoreChange}
      onSelectParticipant={handleSelectParticipant}
      onToggleLive={handleToggleLive}
    />
  );
}
```

- [ ] **Step 2: Run the build**

```
npm run build
```

Expected: exits 0. There will be a compile error "Cannot find module './BracketView'" â€” that is expected and confirms the import is wired correctly. The build is expected to fail at this step because BracketView does not exist yet. Ignore the error and proceed.

**Actual expected result for step 2:** Build will ERROR because `BracketView` does not exist yet. This is acceptable â€” Task 5 creates it.

- [ ] **Step 3: Commit**

```bash
git add src/components/BracketPage.jsx
git commit -m "feat: add BracketPage state owner with score, live, participant handling"
```

---

## Task 5: BracketView.jsx + RoundColumn.jsx

**Files:**
- Create: `src/components/BracketView.jsx`
- Create: `src/components/RoundColumn.jsx`

**Interfaces:**
- Consumes from Task 4: `bracket`, `participants`, `liveMatchId`, `onScoreChange`, `onSelectParticipant`, `onToggleLive`
- Consumes from Task 2: `computeMatchMargins(roundIdx, matchIdx)`, `computeConnectorHeight(roundIdx)`
- Produces: renders `.bracket-view` â†’ `.round-column[]` â†’ `.match-wrapper[]` with correct margin + `--connector-h` CSS var + connector classes; renders `<MatchCard>` per match

- [ ] **Step 1: Create `src/components/BracketView.jsx`**

```jsx
import React, { useMemo } from 'react';
import RoundColumn from './RoundColumn';

export default function BracketView({
  bracket, participants, liveMatchId,
  onScoreChange, onSelectParticipant, onToggleLive,
}) {
  var rounds      = bracket.rounds;
  var totalRounds = rounds.length;

  // Set of participant IDs already used in Round 1 (for duplicate prevention)
  var usedInRound1 = useMemo(function() {
    var used = new Set();
    if (!rounds[0]) return used;
    rounds[0].forEach(function(m) {
      if (m.p1 && m.p1.id != null) used.add(String(m.p1.id));
      if (m.p2 && m.p2.id != null) used.add(String(m.p2.id));
    });
    return used;
  }, [rounds]);

  return (
    <div className="bracket-view">
      {rounds.map(function(round, roundIdx) {
        return (
          <RoundColumn
            key={roundIdx}
            round={round}
            roundIdx={roundIdx}
            totalRounds={totalRounds}
            participants={participants}
            usedInRound1={usedInRound1}
            liveMatchId={liveMatchId}
            onScoreChange={onScoreChange}
            onSelectParticipant={onSelectParticipant}
            onToggleLive={onToggleLive}
          />
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Create `src/components/RoundColumn.jsx`**

```jsx
import React from 'react';
import MatchCard from './MatchCard';
import { computeMatchMargins, computeConnectorHeight } from './bracketUtils';

function getRoundLabel(roundIdx, totalRounds) {
  var fromEnd = totalRounds - 1 - roundIdx;
  if (fromEnd === 0) return 'FINAL';
  if (fromEnd === 1) return 'SEMI FINAL';
  if (fromEnd === 2) return 'QUARTER FINAL';
  return 'ROUND ' + (roundIdx + 1);
}

// Global sequential match number offset for this round
// (sum of all matches in preceding rounds)
function getMatchNumOffset(roundIdx, totalRounds) {
  var totalSlots = Math.pow(2, totalRounds);
  var offset = 0;
  for (var r = 0; r < roundIdx; r++) {
    offset += totalSlots / Math.pow(2, r + 1);
  }
  return offset;
}

export default function RoundColumn({
  round, roundIdx, totalRounds, participants, usedInRound1,
  liveMatchId, onScoreChange, onSelectParticipant, onToggleLive,
}) {
  var isFirstRound = roundIdx === 0;
  var isFinalRound = roundIdx === totalRounds - 1;
  var connectorH   = computeConnectorHeight(roundIdx);
  var matchOffset  = getMatchNumOffset(roundIdx, totalRounds);

  return (
    <div className="round-column">
      <div className="round-label">{getRoundLabel(roundIdx, totalRounds)}</div>

      {round.map(function(match, matchIdx) {
        var margins       = computeMatchMargins(roundIdx, matchIdx);
        var isTop         = matchIdx % 2 === 0;
        var hasLeftArm    = !isFirstRound;
        var connectorTop  = !isFinalRound && isTop;
        var connectorBot  = !isFinalRound && !isTop;

        var wrapperClass  = 'match-wrapper'
          + (hasLeftArm   ? ' has-left-arm'      : '')
          + (connectorTop ? ' connector-top'     : '')
          + (connectorBot ? ' connector-bottom'  : '');

        return (
          <div
            key={match.id}
            className={wrapperClass}
            style={{
              marginTop:     margins.marginTop + 'px',
              '--connector-h': connectorH + 'px',
            }}
          >
            <MatchCard
              match={match}
              matchNum={matchOffset + matchIdx + 1}
              roundIdx={roundIdx}
              matchIdx={matchIdx}
              isFirstRound={isFirstRound}
              participants={participants}
              usedInRound1={usedInRound1}
              isLive={match.id === liveMatchId}
              onScoreChange={onScoreChange}
              onSelectParticipant={onSelectParticipant}
              onToggleLive={onToggleLive}
            />
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Run the build**

```
npm run build
```

Expected: exits 0 (or fails only because `MatchCard` does not exist yet â€” acceptable, same as Task 4 Step 2).

- [ ] **Step 4: Commit**

```bash
git add src/components/BracketView.jsx src/components/RoundColumn.jsx
git commit -m "feat: add BracketView and RoundColumn layout components"
```

---

## Task 6: MatchCard, ParticipantSlot, ScoreInput

**Files:**
- Create: `src/components/MatchCard.jsx`
- Create: `src/components/ParticipantSlot.jsx`
- Create: `src/components/ScoreInput.jsx`

**Interfaces:**
- Consumes from Task 2: `getParticipantLabel(p)` from `./bracketUtils`
- Consumes props from `RoundColumn`: `match`, `matchNum`, `roundIdx`, `matchIdx`, `isFirstRound`, `participants`, `usedInRound1`, `isLive`, `onScoreChange`, `onSelectParticipant`, `onToggleLive`
- Produces: fully interactive match card with LIVE button, participant dropdowns/labels, score inputs, WIN/LOSE badges

- [ ] **Step 1: Create `src/components/ScoreInput.jsx`**

```jsx
import React from 'react';

export default function ScoreInput({ value, onChange, disabled }) {
  return (
    <input
      type="number"
      className="score-input"
      min="0"
      max="999"
      value={value === null || value === undefined ? '' : value}
      placeholder="â€”"
      disabled={disabled}
      onChange={function(e) { onChange(e.target.value); }}
    />
  );
}
```

- [ ] **Step 2: Create `src/components/ParticipantSlot.jsx`**

```jsx
import React from 'react';
import { getParticipantLabel } from './bracketUtils';

export default function ParticipantSlot({
  participant, isFirstRound, participants, usedInRound1, onSelect,
}) {
  var isBye = participant && participant.name === 'BYE';

  if (isBye) {
    return <span className="participant-label bye">BYE</span>;
  }

  if (isFirstRound) {
    var currentId = participant ? String(participant.id) : '';

    var available = (participants || []).filter(function(p) {
      if (!p || !p.name || !p.name.trim()) return false;
      return !usedInRound1.has(String(p.id)) || String(p.id) === currentId;
    });

    return (
      <select
        className="participant-select"
        value={currentId}
        onChange={function(e) { onSelect(e.target.value || null); }}
      >
        <option value="">â€” Pilih Peserta â€”</option>
        {available.map(function(p) {
          return (
            <option key={p.id} value={String(p.id)}>
              {getParticipantLabel(p)}
            </option>
          );
        })}
      </select>
    );
  }

  // Round 2+: read-only display
  if (!participant) {
    return <span className="participant-label tbd">TBD</span>;
  }

  return <span className="participant-label">{getParticipantLabel(participant)}</span>;
}
```

- [ ] **Step 3: Create `src/components/MatchCard.jsx`**

```jsx
import React from 'react';
import ParticipantSlot from './ParticipantSlot';
import ScoreInput from './ScoreInput';

export default function MatchCard({
  match, matchNum, roundIdx, matchIdx,
  isFirstRound, participants, usedInRound1,
  isLive, onScoreChange, onSelectParticipant, onToggleLive,
}) {
  var winner    = match.winner;
  var p1IsWin   = winner && match.p1 && String(winner.id) === String(match.p1.id);
  var p2IsWin   = winner && match.p2 && String(winner.id) === String(match.p2.id);
  var bothScored = match.score1 !== '' && match.score1 != null
                && match.score2 !== '' && match.score2 != null;
  var p1IsBye   = match.p1 && match.p1.name === 'BYE';
  var p2IsBye   = match.p2 && match.p2.name === 'BYE';
  var isByeMatch = p1IsBye || p2IsBye;

  return (
    <div className={'match-card' + (isLive ? ' live' : '')}>

      {/* Header */}
      <div className="match-header">
        <span className="match-number">Match #{matchNum}</span>
        <button
          className={'live-btn' + (isLive ? ' active' : '')}
          onClick={function() { onToggleLive(match.id); }}
          disabled={isByeMatch}
          title={isLive ? 'Nonaktifkan LIVE' : 'Tandai sebagai LIVE'}
        >
          {isLive ? 'ðŸ”´ LIVE' : 'LIVE'}
        </button>
      </div>

      {/* Participant 1 row */}
      <div className={'match-slot' + (p1IsWin ? ' winner-slot' : p2IsWin ? ' loser-slot' : '')}>
        <ParticipantSlot
          participant={match.p1}
          isFirstRound={isFirstRound}
          participants={participants}
          usedInRound1={usedInRound1}
          onSelect={function(id) { onSelectParticipant(roundIdx, matchIdx, 1, id); }}
        />
        {!p1IsBye && (
          <ScoreInput
            value={match.score1}
            onChange={function(v) { onScoreChange(roundIdx, matchIdx, 1, v); }}
            disabled={false}
          />
        )}
        {bothScored && (
          <span className={'badge ' + (p1IsWin ? 'win' : 'lose')}>
            {p1IsWin ? 'WIN' : 'LOSE'}
          </span>
        )}
      </div>

      {/* Participant 2 row */}
      <div className={'match-slot' + (p2IsWin ? ' winner-slot' : p1IsWin ? ' loser-slot' : '')}>
        <ParticipantSlot
          participant={match.p2}
          isFirstRound={isFirstRound}
          participants={participants}
          usedInRound1={usedInRound1}
          onSelect={function(id) { onSelectParticipant(roundIdx, matchIdx, 2, id); }}
        />
        {!p2IsBye && (
          <ScoreInput
            value={match.score2}
            onChange={function(v) { onScoreChange(roundIdx, matchIdx, 2, v); }}
            disabled={false}
          />
        )}
        {bothScored && (
          <span className={'badge ' + (p2IsWin ? 'win' : 'lose')}>
            {p2IsWin ? 'WIN' : 'LOSE'}
          </span>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run the build â€” expect success this time**

```
npm run build
```

Expected: exits 0. All components now exist. Output confirms `bracket.bundle.js` and `bracket.bundle.css` written.

- [ ] **Step 5: Run existing unit tests to confirm nothing broken**

```
node --test tests/bracket.test.js
node --test tests/tournament.test.js
node --test tests/bracket-react.test.js
```

Expected: all three suites pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/MatchCard.jsx src/components/ParticipantSlot.jsx src/components/ScoreInput.jsx
git commit -m "feat: add MatchCard, ParticipantSlot, ScoreInput interactive components"
```

---

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
      window.dispatchEvent(new CustomEvent('RNR INTAN:bracket-activated'));
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
    localStorage.setItem('RNR INTAN_tournament', JSON.stringify({ size: sz, status: 'setup', currentRound: 0 }));
    localStorage.setItem('RNR INTAN_participants', JSON.stringify(participants));
    localStorage.removeItem('RNR INTAN_bracket');
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

