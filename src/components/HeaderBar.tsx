import React from 'react';
import './HeaderBar.css';
import { XPBar } from './XPBar';
import { CoinsDisplay } from './CoinsDisplay';

interface HeaderBarProps {
  level: number;
  coins: number;
  xpIntoLevel: number;
  xpToNext: number;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  level,
  coins,
  xpIntoLevel,
  xpToNext,
}) => {
  return (
    <header className="header-bar header-bar--compact">
      <div className="header-bar-main">
        <div className="header-level">
          <span className="header-stat-label">Lv</span>
          <span className="header-stat-value">{level}</span>
        </div>

        <div className="header-coins">
          <span className="header-coin-value">
            <CoinsDisplay amount={coins} />
          </span>
        </div>
      </div>

      <XPBar current={xpIntoLevel} needed={xpToNext} />
    </header>
  );
};
