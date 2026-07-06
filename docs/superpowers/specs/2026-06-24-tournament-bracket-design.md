# Tournament Bracket Module â€” Design Spec

**Date:** 2026-06-24  
**Project:** BILPOS â€” RNR Billiard Tournament System  
**Scope:** Complete redesign of the Tournament Bracket module to a Challonge-style horizontal single-elimination bracket with automatic winner advancement, LIVE match indicator, participant dropdowns with handicap display, and full localStorage persistence.

---

## 1. Overview

The Tournament Bracket module replaces the existing flat-card `Bracket.jsx` with a properly structured, horizontally scrollable, Challonge-style bracket. It integrates as a new section in the existing single-page app, reusing the current `BilposTournament` and `BilposStorage` globals.

**Technology stack:**
- React 18 (already in project)
- esbuild (already in project, `npm run build`)
- CSS pseudo-element connecting lines (no SVG, no extra deps)
- `window.BilposTournament` for bracket data logic
- `window.BilposStorage` for localStorage persistence

**Supported tournament sizes:** 16, 32, 48, 64, 96, 128 participants  
Non-power-of-2 sizes (48, 96) use BYE slots to pad to the next power of 2, auto-resolved by `BilposTournament.autoAdvanceByes()`.

---

## 2. Integration into index.html

### 2.1 New nav item
Add a `"Bracket"` entry to the top taskbar in `index.html`:
```html
<div class="sidebar-nav-item" data-section="bracket">Bracket</div>
```

### 2.2 New section
Add inside `<main class="RNR INTAN-main">`:
```html
<section class="RNR INTAN-section" id="section-bracket">
  <div class="section-header">
    <div class="section-title"><i class="fas fa-sitemap"></i> Tournament Bracket</div>
  </div>
  <div id="bracket-react-root"></div>
</section>
```

### 2.3 Load the React bundle
Add at the bottom of `<body>`, after existing scripts:
```html
<script src="assets/js/bracket.bundle.js"></script>
```

---

## 3. Component Architecture

```
BracketPage
  â””â”€â”€ BracketView
        â””â”€â”€ RoundColumn[]        (one per round)
              â””â”€â”€ MatchCard[]    (one per match in round)
                    â”œâ”€â”€ ParticipantSlot  (top slot)
                    â””â”€â”€ ParticipantSlot  (bottom slot)
                          â””â”€â”€ ScoreInput
```

### File list
| File | Role |
|---|---|
| `src/entry.jsx` | Mount point â€” updated to mount `BracketPage` |
| `src/components/BracketPage.jsx` | State owner, storage sync, bracket orchestration |
| `src/components/BracketView.jsx` | Horizontal scroll container, renders `RoundColumn` list |
| `src/components/RoundColumn.jsx` | Round label + match list with correct spacing |
| `src/components/MatchCard.jsx` | Single match card with LIVE button |
| `src/components/ParticipantSlot.jsx` | Dropdown (Round 1) or read-only name (Round 2+) |
| `src/components/ScoreInput.jsx` | Controlled numeric score input |
| `src/components/Bracket.css` | All styles â€” replaces current file |

---

## 4. State Design

### BracketPage state
```js
{
  bracket: {           // from BilposTournament.generateBracket()
    rounds: [          // array of rounds
      [                // round 0 (first round)
        {
          id: 'r0m0',
          p1: { id, name, hc, hcCustom, drawingNumber } | null,
          p2: { id, name, hc, hcCustom, drawingNumber } | null,
          score1: '' | number,
          score2: '' | number,
          winner: participant | null,
          status: 'pending' | 'done'
        },
        ...
      ],
      ...
    ],
    size: 32,
    generatedAt: timestamp
  },
  liveMatchId: string | null   // ID of the currently LIVE match
}
```

### Persistence
- On every state change: `BilposStorage.saveBracket({ bracket, liveMatchId })`
- On mount: load from `BilposStorage.loadBracket()`. If `bracket.size` matches current tournament size, restore. Otherwise generate fresh.

---

## 5. Bracket Layout (CSS)

### Round columns
```css
.bracket-view {
  display: flex;
  flex-direction: row;
  overflow-x: auto;
  gap: 40px;   /* ROUND_GAP between columns */
  padding: 24px;
  min-height: 400px;
}

.round-column {
  display: flex;
  flex-direction: column;
  min-width: 280px;
  position: relative;
}

.round-label {
  text-align: center;
  font-weight: 700;
  font-size: 11px;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: #7a8fa6;
  margin-bottom: 16px;
  height: 24px;
}
```

### Match card spacing
Match cards in each round are spaced with JavaScript-computed inline styles based on:

```js
const CARD_HEIGHT = 100;   // px
const CARD_GAP    = 8;     // px base gap (Round 1)

// For a match at (roundIdx, matchIdx):
const step   = (CARD_HEIGHT + CARD_GAP) * Math.pow(2, roundIdx);
const offset = step / 2 - CARD_HEIGHT / 2;          // top margin of first match in round

// marginTop for each match wrapper:
const marginTop = matchIdx === 0 ? offset : step - CARD_HEIGHT;
```

Applied as `style={{ marginTop: marginTop + 'px' }}` on `.match-wrapper`.

### Connecting lines (CSS pseudo-elements)

Every match card (except in the Final round) renders with connecting line pseudo-elements via CSS custom properties set inline:

```css
/* Horizontal arm from right edge to next column */
.match-wrapper::after {
  content: '';
  position: absolute;
  right: -40px;          /* ROUND_GAP */
  top: 50%;
  width: 40px;
  height: 2px;
  background: #2a3f55;
  transform: translateY(-50%);
}

/* Vertical connector â€” top match of pair goes DOWN */
.match-wrapper.connector-top::before {
  content: '';
  position: absolute;
  right: -40px;
  top: 50%;
  width: 2px;
  height: var(--connector-h);  /* = step / 2 */
  background: #2a3f55;
}

/* Vertical connector â€” bottom match of pair goes UP */
.match-wrapper.connector-bottom::before {
  content: '';
  position: absolute;
  right: -40px;
  bottom: 50%;
  width: 2px;
  height: var(--connector-h);
  background: #2a3f55;
}
```

The `--connector-h` CSS variable = `step / 2` (half the round step), set inline on each `.match-wrapper`.

A match is `connector-top` if `matchIdx % 2 === 0` and `connector-bottom` if `matchIdx % 2 === 1`.  
The Final round match gets neither connector class (no outgoing line).

---

## 6. Match Card Design

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  Match #3                     [ LIVE ]   â”‚
â”‚â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”Œâ”€â”€â” [WIN] â”‚
â”‚  â”‚ Ihsan - HC 3B          â–¼ â”‚ â”‚7 â”‚       â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â””â”€â”€â”˜       â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”Œâ”€â”€â”[LOSE] â”‚
â”‚  â”‚ Akbar - HC 3N          â–¼ â”‚ â”‚5 â”‚       â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â””â”€â”€â”˜       â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

- **Match label** â€” top-left, `"Match #N"` using a global sequential match number
- **LIVE button** â€” top-right; clicking sets this match as live (or clears if already active)
- **Participant slots** â€” two rows, each with a `ParticipantSlot` + `ScoreInput`
- **WIN/LOSE badges** â€” appear only when both scores entered and unequal
- **Winner row** â€” subtle `border-left: 3px solid #1db954` (green)
- **Loser row** â€” `opacity: 0.7`
- **BYE slot** â€” grey italic label, no dropdown, no score input; match is auto-resolved on bracket generation

### LIVE state
```css
.match-card.live {
  animation: liveBlink 1s ease-in-out infinite;
  border-color: #ff1744;
}

@keyframes liveBlink {
  0%, 100% { box-shadow: 0 0 0 0 rgba(255, 23, 68, 0); border-color: rgba(255,23,68,0.2); }
  50%       { box-shadow: 0 0 12px 4px rgba(255, 23, 68, 0.5); border-color: #ff1744; }
}
```

Only one match can be live at a time. Switching live to another match removes it from the previous one.

---

## 7. ParticipantSlot Behavior

### Round 1 (empty/selectable slot)
- Renders a `<select>` dropdown
- Options: all participants NOT already selected in any other Round 1 slot, PLUS the currently selected participant (so it always shows its own value)
- Option label format: `"Ihsan - HC 3B"` using `getHcLabel(p)`:
  ```js
  function getHcLabel(p) {
    if (!p) return '';
    const custom = String(p.hcCustom || '').trim();
    const hc = String(p.hc || '').trim();
    if (hc === 'custom' || custom) return custom || hc;
    return hc;
  }
  // Display: `${p.name} - ${getHcLabel(p)}` (omit HC part if empty)
  ```
- Selecting a participant updates `bracket.rounds[0][matchIdx].p1` or `.p2`
- An "â€” Pilih Peserta â€”" placeholder option is first (value `""`)

### Round 2+ (winner-filled slot)
- Renders as a read-only `<div>` with the participant's name and HC label
- If slot is empty (winner not yet determined): renders a grey dashed placeholder `"TBD"`
- No dropdown, no remove button

### BYE slot
- Renders as grey italic text `"BYE"`
- No score input visible

---

## 8. Score & Winner Advancement

### Score update flow
1. User changes `score1` or `score2` on a match `(roundIdx, matchIdx)`
2. Update `bracket.rounds[roundIdx][matchIdx]` with new score
3. Determine winner:
   - `score1 > score2` â†’ `winner = p1`, `status = 'done'`
   - `score2 > score1` â†’ `winner = p2`, `status = 'done'`
   - Equal or either null â†’ `winner = null`, `status = 'pending'`
4. If winner changed:
   - Call `BilposTournament.advanceWinner(bracket, roundIdx, matchIdx, winner)`
   - If winner was cleared, also clear the downstream slot: set `nextMatch.p1` or `.p2` to `null` and cascade clearing to any further advancement
5. Save full bracket to `BilposStorage.saveBracket(...)`

### Cascade clearing
When a previously-determined winner is removed (score cleared or tied):
- Find the next round match that was populated by this match
- Clear that slot (p1 or p2)
- If that match also had a determined winner, recursively clear onwards
- This ensures bracket state is always consistent

---

## 9. Duplicate Prevention

Applies **only to Round 1** dropdown selections.

```js
// Computed on each render:
const usedInRound1 = new Set(
  bracket.rounds[0].flatMap(m => [m.p1?.id, m.p2?.id].filter(Boolean))
);

// For slot (roundIdx=0, matchIdx=K, slot=1):
const availableParticipants = allParticipants.filter(p =>
  !usedInRound1.has(p.id) || p.id === currentSlotParticipantId
);
```

Each dropdown only shows unselected participants plus the participant currently occupying that slot. This is computed fresh on every render â€” selecting one participant immediately removes them from all other dropdowns.

---

## 10. Round Labels

Labels computed by `BilposTournament.getRoundLabel(roundIdx, totalRounds)`:

| Round from end | Label |
|---|---|
| 0 | FINAL |
| 1 | SEMI FINAL |
| 2 | QUARTER FINAL |
| 3+ | ROUND N |

---

## 11. Responsive Design

- **Desktop (â‰¥1200px):** Full horizontal bracket, all rounds visible or scrollable
- **Tablet (768â€“1199px):** Horizontal scroll, cards at 260px width
- **Mobile (<768px):** Horizontal scroll enforced, cards compact at 240px, touch-native `<select>` dropdowns, score inputs `type="number"` with mobile numpad

```css
@media (max-width: 767px) {
  .match-card { min-width: 200px; }
  .score-input { width: 48px; }
  .round-label { font-size: 9px; }
}
```

---

## 12. entry.jsx â€” Mount Strategy

```jsx
function mountBracket() {
  const rootEl = document.getElementById('bracket-react-root');
  if (!rootEl) return;
  const root = createRoot(rootEl);
  root.render(<BracketPage />);
}

// Mount when DOM is ready and bracket section becomes active
document.addEventListener('DOMContentLoaded', () => {
  // Mount immediately (section hidden by CSS until activated)
  mountBracket();

  // Re-mount if tournament size changes (nav section change reuses same root)
  // BracketPage itself handles re-reading storage on section activation
});
```

`BracketPage` uses a `visibilitychange` / section-activation pattern via a small `useEffect` to re-read `BilposStorage` when the bracket tab is clicked, ensuring fresh participant data.

---

## 13. Out of Scope

- **Double-elimination bracket** â€” single elimination only
- **Real-time multi-user sync** â€” localStorage only, no WebSocket
- **Print / PDF export** â€” not in this module
- **Seeding / randomization** â€” participants placed in order of `drawingNumber`
- **Third-place match** â€” not implemented

