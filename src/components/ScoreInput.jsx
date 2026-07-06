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

