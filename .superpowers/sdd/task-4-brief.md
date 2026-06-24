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
      if (e.key === 'bilpos_participants' || e.key === 'bilpos_tournament') {
        setState(loadInitialState());
      }
    }
    window.addEventListener('storage', onStorage);
    return function() { window.removeEventListener('storage', onStorage); };
  }, []);

  // Re-read storage when bracket nav tab is clicked (bilpos:bracket-activated event)
  useEffect(function() {
    function onActivated() { setState(loadInitialState()); }
    window.addEventListener('bilpos:bracket-activated', onActivated);
    return function() { window.removeEventListener('bilpos:bracket-activated', onActivated); };
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

