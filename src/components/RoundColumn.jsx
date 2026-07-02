import React from 'react';
import MatchCard from './MatchCard';
import { computeMatchTop, computeMatchAreaHeight, computeConnectorHeight } from './bracketUtils';

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
  round, roundIdx, totalRounds, participants, usedParticipantIds, roundLabel,
  liveMatchId, onScoreChange, onSelectParticipant, onToggleLive,
}) {
  var isFirstRound = roundIdx === 0;
  var isFinalRound = roundIdx === totalRounds - 1;
  var connectorH   = computeConnectorHeight(roundIdx);
  var matchOffset  = getMatchNumOffset(roundIdx, totalRounds);
  var displayLabel = roundLabel || getRoundLabel(roundIdx, totalRounds);
  var matchAreaH   = computeMatchAreaHeight(roundIdx, round.length);

  return (
    <div className="round-column">
      <div className="round-label">{displayLabel}</div>
      <div className="match-area" style={{ height: matchAreaH + 'px' }}>
        {round.map(function(match, matchIdx) {
          var topY         = computeMatchTop(roundIdx, matchIdx);
          var isTop        = matchIdx % 2 === 0;
          var hasLeftArm   = !isFirstRound;
          var connectorTop = !isFinalRound && isTop;
          var connectorBot = !isFinalRound && !isTop;

          var wrapperClass = 'match-wrapper'
            + (hasLeftArm   ? ' has-left-arm'      : '')
            + (connectorTop ? ' connector-top'     : '')
            + (connectorBot ? ' connector-bottom'  : '');

          return (
            <div
              key={match.id}
              className={wrapperClass}
              style={{
                top:             topY + 'px',
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
                usedParticipantIds={usedParticipantIds}
                liveMatchId={liveMatchId}
                onScoreChange={onScoreChange}
                onSelectParticipant={onSelectParticipant}
                onToggleLive={onToggleLive}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
