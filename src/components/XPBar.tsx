import React from 'react';

interface XPBarProps {
  current: number;
  needed: number;
}

export const XPBar: React.FC<XPBarProps> = ({ current, needed }) => {
  const isMax = needed === 0 && current > 0;

  // At max level, treat total as "current" so label is e.g. "3845 / 3845 XP"
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
          {`${current} / ${total} XP`}
        </div>
      </div>
    </div>
  );
};
