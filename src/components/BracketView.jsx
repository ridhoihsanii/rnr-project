import React from 'react';
import './Bracket.css';
import RoundColumn from './RoundColumn';

export default function BracketView({
  bracket, participants, liveMatchIds,
  onScoreChange, onSelectParticipant, onToggleLive,
  usedParticipantIds, roundLabels,
}) {
  var rounds      = bracket.rounds;
  var totalRounds = rounds.length;

  return (
    <div className="bracket-scroll-container">
      <div className="bracket-view">
        {rounds.map(function(round, roundIdx) {
          return (
            <RoundColumn
              key={roundIdx}
              round={round}
              roundIdx={roundIdx}
              totalRounds={totalRounds}
              participants={participants}
              usedParticipantIds={usedParticipantIds}
              roundLabel={roundLabels && roundLabels[roundIdx]}
              liveMatchIds={liveMatchIds}
              onScoreChange={onScoreChange}
              onSelectParticipant={onSelectParticipant}
              onToggleLive={onToggleLive}
            />
          );
        })}
      </div>
    </div>
  );
}

