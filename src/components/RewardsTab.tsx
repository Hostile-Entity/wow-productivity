// src/components/RewardsTab.tsx
import React, { useState } from 'react';
import './RewardsTab.css';
import './Tooltip.css';
import { useGame } from '../state/GameStore';
import { rewardLabel, REWARD_META } from '../config/rewards';
import type { RewardType } from '../types';
import { EFFECTS_META } from '../config/effects';
import { assetUrl } from '../utils/assets';

function qualityClass(quality: string): string {
  switch (quality) {
    case 'uncommon':
      return 'q2';
    case 'rare':
      return 'q3';
    case 'epic':
      return 'q4';
    case 'legendary':
      return 'q5';
    default:
      return '';
  }
}

interface RewardTooltipProps {
  type: RewardType;
  onUse(): void;
  onClose(): void;
  blockReason?: string;
}

const RewardTooltip: React.FC<RewardTooltipProps> = ({
  type,
  onUse,
  onClose,
  blockReason,
}) => {
  const meta = REWARD_META[type];
  const isBlocked = !!blockReason;

  return (
    <div className="tooltip-backdrop" onClick={onClose}>
      <div
        className="wow-tooltip-wrapper"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="wow-tooltip-iconwrap">
          <div className={`wow-tooltip-iconinner ${qualityClass(meta.quality)}`}>
            <img
              src={assetUrl(meta.icon)}
              alt={meta.name}
              width={36}
              height={36}
            />
          </div>
        </div>

        <div className="wow-tooltip">
          <div className={'wow-tooltip-name ' + qualityClass(meta.quality)}>
            {meta.name}
          </div>
          <p className="wow-tooltip-line wow-tooltip-ilvl">
            Item Level {meta.itemLevel}
          </p>
          <p className="wow-tooltip-line">
            Requires Level {meta.requiredLevel}
          </p>
          <p className="wow-tooltip-line wow-tooltip-use">
            {meta.useDescription}
          </p>
        </div>
      </div>

      <button
        type="button"
        className="button-primary tooltip-use-btn"
        onClick={onUse}
        disabled={isBlocked}
      >
        {isBlocked ? blockReason : 'Use'}
      </button>
    </div>
  );
};

export const RewardsTab: React.FC = () => {
  const { state, openChest, useReward } = useGame();
  const [tooltipType, setTooltipType] = useState<RewardType | null>(null);

  function getUseBlockReason(type: RewardType): string | null {
    const effectMeta = EFFECTS_META[type];
    if (!effectMeta) return null;

    const sameKindActive = state.activeEffects.some(
      (e) => e.kind === effectMeta.kind,
    );
    if (!sameKindActive) return null;
    return 'Already in effect';
  }

  function handleUse(type: RewardType) {
    const reason = getUseBlockReason(type);
    if (reason) return;
    useReward(type);
    setTooltipType(null);
  }

  const blockReason = tooltipType ? getUseBlockReason(tooltipType) : null;

  return (
    <>
      <div className="panel panel--padded panel--mt-8">
        <h2 className="section-title">Rewards</h2>

        <div className="rewards-header">
          <div>
            <div className="card-subtitle">Chests available</div>
            <div className="rewards-chests-count">
              {state.boxesAvailable}
            </div>
          </div>
          <button
            className="button-primary"
            type="button"
            disabled={state.boxesAvailable <= 0}
            onClick={openChest}
          >
            {state.boxesAvailable <= 0 || !state.chestLevel
              ? 'Open chest'
              : `Open Chest lvl ${state.chestLevel}`}
          </button>
        </div>

        <div className="rewards-section">
          <div className="card-subtitle rewards-active-subtitle">
            Active rewards
          </div>
          <div className="buff-strip">
            {state.rewardsInventory.map((r) => {
              const meta = REWARD_META[r.type];
              return (
                <button
                  key={r.type}
                  type="button"
                  className={`buff-icon ${qualityClass(meta.quality)}`}
                  onClick={() => setTooltipType(r.type)}
                  title={rewardLabel(r.type)}
                >
                  <div className="buff-icon-frame">
                    <img
                      className="buff-icon-img"
                      src={assetUrl(meta.icon)}
                      alt={meta.name}
                    />
                    <img
                      className="buff-icon-frame-img"
                      src={assetUrl('icons/icon_frame.png')}
                      alt=""
                      aria-hidden="true"
                    />
                    {r.count > 1 && (
                      <span className="buff-icon-stack">{r.count}</span>
                    )}
                  </div>
                </button>
              );
            })}
            {state.rewardsInventory.length === 0 && (
              <div className="empty-state">
                No rewards yet. Level up and open chests.
              </div>
            )}
          </div>
        </div>
      </div>

      {tooltipType && (
        <RewardTooltip
          type={tooltipType}
          onUse={() => handleUse(tooltipType)}
          onClose={() => setTooltipType(null)}
          blockReason={blockReason ?? undefined}
        />
      )}
    </>
  );
};
