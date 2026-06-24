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
        <option value="">— Pilih Peserta —</option>
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
