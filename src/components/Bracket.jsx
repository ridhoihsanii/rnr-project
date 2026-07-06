import React, { useState, useEffect } from "react";
import "./Bracket.css";

/*
Props:
- participants: [{id, name}]
- initialMatches: [{id, slot1Id, slot2Id, slot1Score, slot2Score, startTime, live}]
- onChange(match) optional
*/
export default function Bracket({ participants = [], initialMatches = [], onChange }) {
  // matches state (clone initial or generate for 16)
  const [matches, setMatches] = useState(() => {
    if (initialMatches.length) return initialMatches;
    // Build bracket automatically from participants length
    const players = Math.max(1, participants.length);
    // next power of two >= players
    let slots = 1;
    while (slots < players) slots <<= 1;
    const totalMatches = slots - 1;

    // matches per round (round 0 = first round)
    const rounds = Math.log2(slots);
    const matchesPerRound = Array.from({ length: rounds }, (_, r) => slots / Math.pow(2, r + 1));
    const roundBases = [];
    let acc = 0;
    for (let r = 0; r < matchesPerRound.length; r++) {
      roundBases.push(acc);
      acc += matchesPerRound[r];
    }

    // create empty matches array
    const out = Array.from({ length: totalMatches }, (_, i) => ({
      id: i,
      slot1Id: null,
      slot2Id: null,
      slot1Score: null,
      slot2Score: null,
      startTime: null,
      live: false,
    }));

    // seed first round matches with participants (in order). byes remain null.
    const firstRoundBase = roundBases[0];
    let pi = 0;
    for (let m = 0; m < matchesPerRound[0]; m++) {
      const idx = firstRoundBase + m;
      if (pi < participants.length) out[idx].slot1Id = participants[pi++].id;
      if (pi < participants.length) out[idx].slot2Id = participants[pi++].id;
    }

    return out;
  });

  // available participants pool
  const [pool, setPool] = useState(participants.map(p => ({...p})));

  useEffect(() => {
    // rebuild pool when participants or matches change (remove selected)
    const selected = new Set(matches.flatMap(m => [m.slot1Id, m.slot2Id].filter(Boolean)));
    setPool(participants.filter(p => !selected.has(p.id)));
  }, [participants, matches]);

  // If participants prop changes and user didn't supply initialMatches, rebuild bracket automatically
  useEffect(() => {
    if (initialMatches.length) return;
    const players = Math.max(1, participants.length);
    let slots = 1;
    while (slots < players) slots <<= 1;
    const totalMatches = slots - 1;
    const rounds = Math.log2(slots);
    const matchesPerRound = Array.from({ length: rounds }, (_, r) => slots / Math.pow(2, r + 1));
    const roundBases = [];
    let acc = 0;
    for (let r = 0; r < matchesPerRound.length; r++) { roundBases.push(acc); acc += matchesPerRound[r]; }
    const out = Array.from({ length: totalMatches }, (_, i) => ({
      id: i, slot1Id: null, slot2Id: null, slot1Score: null, slot2Score: null, startTime: null, live: false,
    }));
    let pi = 0;
    const firstRoundBase = roundBases[0];
    for (let m = 0; m < matchesPerRound[0]; m++) {
      const idx = firstRoundBase + m;
      if (pi < participants.length) out[idx].slot1Id = participants[pi++].id;
      if (pi < participants.length) out[idx].slot2Id = participants[pi++].id;
    }
    setMatches(out);
  }, [participants]);

  const updateMatch = (idx, patch) => {
    setMatches(prev => {
      const next = prev.map(m => ({...m}));
      next[idx] = {...next[idx], ...patch};
      return next;
    });
    if (onChange) onChange({...matches[idx], ...patch});
  };

  const onSelect = (matchIdx, slot, participantId) => {
    const key = slot === 1 ? "slot1Id" : "slot2Id";
    updateMatch(matchIdx, {[key]: participantId});
  };

  const onRemove = (matchIdx, slot) => {
    const key = slot === 1 ? "slot1Id" : "slot2Id";
    updateMatch(matchIdx, {[key]: null, [slot===1?"slot1Score":"slot2Score"]: null});
  };

  const setScore = (matchIdx, slot, value) => {
    const key = slot === 1 ? "slot1Score" : "slot2Score";
    updateMatch(matchIdx, {[key]: value});
    // after setting both scores, resolve winner if unequal
    setTimeout(() => resolveWinner(matchIdx), 0);
  };

  function resolveWinner(matchIdx) {
    const m = matches[matchIdx];
    if (!m) return;
    const a = m.slot1Score;
    const b = m.slot2Score;
    if (a == null || b == null) return;
    if (a === b) return; // tie => require tiebreak
    const winnerId = a > b ? m.slot1Id : m.slot2Id;
    if (!winnerId) return;

    // Reconstruct round info from matches length
    const totalMatches = matches.length;
    const totalSlots = totalMatches + 1; // power of two
    const rounds = Math.log2(totalSlots);
    const matchesPerRound = Array.from({ length: rounds }, (_, r) => totalSlots / Math.pow(2, r + 1));
    const roundBases = [];
    let acc = 0;
    for (let r = 0; r < matchesPerRound.length; r++) {
      roundBases.push(acc);
      acc += matchesPerRound[r];
    }

    // find round of current match
    let roundIdx = null;
    for (let r = 0; r < roundBases.length; r++) {
      const base = roundBases[r];
      const size = matchesPerRound[r];
      if (matchIdx >= base && matchIdx < base + size) { roundIdx = r; break; }
    }
    if (roundIdx === null) return;
    const nextRound = roundIdx + 1;
    if (nextRound >= roundBases.length) return; // no parent (final)

    const parent = roundBases[nextRound] + Math.floor((matchIdx - roundBases[roundIdx]) / 2);
    if (parent != null && parent < matches.length) {
      setMatches(prev => {
        const next = prev.map(x => ({...x}));
        const parentMatch = next[parent];
        if (!parentMatch.slot1Id) parentMatch.slot1Id = winnerId;
        else if (!parentMatch.slot2Id) parentMatch.slot2Id = winnerId;
        return next;
      });
    }
  }

  const toggleLive = idx => updateMatch(idx, {live: !matches[idx].live});

  const isWinner = m => {
    if (m.slot1Score == null || m.slot2Score == null) return null;
    if (m.slot1Score === m.slot2Score) return null;
    return m.slot1Score > m.slot2Score ? 1 : 2;
  };

  return (
    <div className="bracket-root">
      {matches.map((m, i) => {
        const winner = isWinner(m);
        return (
          <div key={m.id} className={`match-card ${m.live ? "live" : ""}`}>
            <div className="match-controls">
              <button className="live-btn" onClick={() => toggleLive(i)}>LIVE</button>
            </div>

            <div className={`slot ${winner===1? "winner": winner===2? "loser": ""}`}>
              <ParticipantSelector
                pool={[...pool, ...(m.slot1Id ? participants.filter(p=>p.id===m.slot1Id):[])]}
                value={m.slot1Id}
                onSelect={id => onSelect(i,1,id)}
                onRemove={() => onRemove(i,1)}
                participants={participants}
              />
              <input type="number" className="score-input" value={m.slot1Score ?? ""} onChange={e=>setScore(i,1, e.target.value === "" ? null : Number(e.target.value))} />
              <span className={`badge ${winner===1?"win": winner===2?"lose":""}`}>{winner===1?"WIN": winner===2?"LOSE":""}</span>
            </div>

            <div className={`slot ${winner===2? "winner": winner===1? "loser": ""}`}>
              <ParticipantSelector
                pool={[...pool, ...(m.slot2Id ? participants.filter(p=>p.id===m.slot2Id):[])]}
                value={m.slot2Id}
                onSelect={id => onSelect(i,2,id)}
                onRemove={() => onRemove(i,2)}
                participants={participants}
              />
              <input type="number" className="score-input" value={m.slot2Score ?? ""} onChange={e=>setScore(i,2, e.target.value === "" ? null : Number(e.target.value))} />
              <span className={`badge ${winner===2?"win": winner===1?"lose":""}`}>{winner===2?"WIN": winner===1?"LOSE":""}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* small dropdown component */
function ParticipantSelector({ pool, value, onSelect, onRemove }) {
  return (
    <div className="selector">
      <select value={value??""} onChange={e => onSelect(e.target.value || null)}>
        <option value="">-- pilih peserta --</option>
        {pool.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      {value && <button className="remove" onClick={onRemove}>Ã—</button>}
    </div>
  );
}

