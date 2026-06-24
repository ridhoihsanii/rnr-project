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

