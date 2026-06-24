import React from 'react';
import { getParticipantLabel } from './bracketUtils';

export default function ParticipantSlot({
  participant, isFirstRound, participants, usedParticipantIds, onSelect,
}) {
  var isBye = participant && participant.name === 'BYE';

  if (isFirstRound) {
    var currentId = (participant && participant.id != null) ? String(participant.id) : '';

    var available = (participants || []).filter(function(p) {
      if (!p || !p.name || !p.name.trim()) return false;
      return !(usedParticipantIds || new Set()).has(String(p.id)) || String(p.id) === currentId;
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
  if (isBye) {
    return <span className="participant-label bye">BYE</span>;
  }
  if (!participant) {
    return <span className="participant-label tbd">TBD</span>;
  }

  return <span className="participant-name">{getParticipantLabel(participant)}</span>;
}
