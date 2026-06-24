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

