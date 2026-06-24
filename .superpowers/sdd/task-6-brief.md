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

