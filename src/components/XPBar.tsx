import React from 'react';
import './XPBar.css';

interface XPBarProps {
  current: number;
  needed: number;
}

export const XPBar: React.FC<XPBarProps> = ({ current, needed }) => {
  const isMax = needed === 0 && current > 0;

  const rawTotal = current + needed;
  const total = isMax ? current : rawTotal;

  const pct = total === 0 ? 100 : Math.min(100, (current / total) * 100);

  return (
    <div className="xp-bar">
      <div className="xp-bar-track">
        <div
          className="xp-bar-fill"
          style={{ width: `${pct}%` }}
        />
        <div className="xp-bar-label">
          {`XP ${current} / ${total}`}
        </div>
      </div>
    </div>
  );
};
