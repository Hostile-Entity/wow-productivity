// src/components/CoinsDisplay.tsx
import React from 'react';
import { coinsToGSC } from '../utils/coins';
import { assetUrl } from '../utils/assets';

interface CoinsDisplayProps {
  amount: number;
  /** If true, positive values get a "+" sign. Default: false */
  showPlus?: boolean;
}

const GOLD_ICON = assetUrl('/icons/gold_coin.png');
const SILVER_ICON = assetUrl('/icons/silver_coin.png');
const COPPER_ICON = assetUrl('/icons/copper_coin.png');

export const CoinsDisplay: React.FC<CoinsDisplayProps> = ({
  amount,
  showPlus = false,
}) => {
  const isNegative = amount < 0;
  const sign = isNegative ? '-' : showPlus && amount > 0 ? '+' : '';
  const { gold, silver, copper } = coinsToGSC(amount);
  console.log(amount)
  console.log(coinsToGSC(amount))

  const segments: React.ReactNode[] = []; // ← changed

  if (gold > 0) {
    segments.push(
      <span key="g" className="coins-segment">
        <span className="coins-value">{gold}</span>
        <img
          src={GOLD_ICON}
          alt="gold"
          className="coins-icon"
          width={12}
          height={12}
        />
      </span>,
    );
    segments.push(
      <span key="s" className="coins-segment">
        <span className="coins-value">{silver}</span>
        <img
          src={SILVER_ICON}
          alt="silver"
          className="coins-icon"
          width={12}
          height={12}
        />
      </span>,
    );
  } else if (silver > 0) {
    segments.push(
      <span key="s" className="coins-segment">
        <span className="coins-value">{silver}</span>
        <img
          src={SILVER_ICON}
          alt="silver"
          className="coins-icon"
          width={12}
          height={12}
        />
      </span>,
    );
  }

  // Copper always shown
  segments.push(
    <span key="c" className="coins-segment">
      <span className="coins-value">{copper}</span>
      <img
        src={COPPER_ICON}
        alt="copper"
        className="coins-icon"
        width={12}
        height={12}
      />
    </span>,
  );

  return (
    <span className="coins-display">
      {sign && <span className="coins-sign">{sign}</span>}
      {segments.map((seg, idx) => (
        <span key={idx} className="coins-chunk">
          {seg}
        </span>
      ))}
    </span>
  );
};
