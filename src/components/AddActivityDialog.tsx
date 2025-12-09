import React, { useState, useEffect, useRef } from 'react';
import './AddActivityDialog.css';
import './Tooltip.css';
import { useGame } from '../state/GameStore';
import type { Activity, ActivityCategory, ActivityTier, LogEntry } from '../types';
import { rewardFor } from '../config/activities';
import { getUnproductiveMinutesSoFar } from '../state/gameLogic';
import { applyEffectsToReward } from '../config/effects';
import { REWARD_META } from '../config/rewards';
import { assetUrl } from '../utils/assets';
import { CoinsDisplay } from './CoinsDisplay';
import { formatDurationLabel } from '../utils/duration';

interface Props {
  open: boolean;
  onClose(): void;
}

const DURATION_OPTIONS: number[] = Array.from({ length: 6 * 4 + 1 }, (_, i) => i * 15);

export const AddActivityDialog: React.FC<Props> = ({ open, onClose }) => {
  const { state, logActivity } = useGame();
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ActivityCategory>('productive');
  const [tier, setTier] = useState<ActivityTier>('green');
  const [hours, setHours] = useState<number>(1);
  const [mins, setMins] = useState<number>(0);
  const [nameFocused, setNameFocused] = useState(false);

  const [now, setNow] = useState<Date>(() => new Date());
  const [openEffectId, setOpenEffectId] = useState<string | null>(null);

  const nameInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!open) return;

    setName('');
    setCategory('productive');
    setTier('green');
    setHours(1);
    setMins(0);
    setNameFocused(false);
    setOpenEffectId(null);
    setNow(new Date());
  }, [open]);

  useEffect(() => {
    if (open && nameInputRef.current) {
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 0);
    }
  }, [open]);

  if (!open) return null;

  const activities = state.activities;

  const tiersForCategory: Record<ActivityCategory, ActivityTier[]> = {
    daily: ['minor', 'major'],
    productive: ['gray', 'green', 'yellow', 'orange', 'red'],
    unproductive: ['idle', 'time-sink'],
  };

  const trimmedName = name.trim();

  const sortedActivities = [...activities].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  let suggestions: Activity[] = [];

  if (trimmedName.length === 0) {
    suggestions = sortedActivities.slice(0, 8);
  } else {
    const q = trimmedName.toLowerCase();

    const startsWith: Activity[] = [];
    const contains: Activity[] = [];

    for (const a of sortedActivities) {
      const lower = a.name.toLowerCase();
      if (lower.startsWith(q)) {
        startsWith.push(a);
      } else if (lower.includes(q)) {
        contains.push(a);
      }
    }

    suggestions = [...startsWith, ...contains].slice(0, 8);
  }

  const matchedActivity: Activity | null =
    trimmedName.length === 0
      ? null
      : activities.find(
          (a) => a.name.toLowerCase() === trimmedName.toLowerCase(),
        ) ?? null;

  const effectiveCategory: ActivityCategory =
    matchedActivity?.category ?? category;
  const tierForPreview: ActivityTier = matchedActivity?.tier ?? tier;

  const isDaily = effectiveCategory === 'daily';

  const totalMinutes = isDaily ? 0 : hours * 60 + mins;
  const hasDurationError = !isDaily && totalMinutes <= 0;

  const hasName = trimmedName.length > 0;
  const canShowPreview = hasName && !hasDurationError;

  const unproductiveMinutesSoFar =
    effectiveCategory === 'unproductive'
      ? getUnproductiveMinutesSoFar(state.log as LogEntry[], now)
      : 0;

  const baseReward = canShowPreview
    ? rewardFor(effectiveCategory, tierForPreview, totalMinutes, {
        unproductiveMinutesBefore: unproductiveMinutesSoFar,
      })
    : null;

  const previewReward = baseReward
    ? applyEffectsToReward(baseReward, {
        category: effectiveCategory,
        when: now,
        log: state.log as LogEntry[],
      })
    : null;

  function formatRemainingTime(expiresAt: string): string {
    const diffMs = new Date(expiresAt).getTime() - now.getTime();
    if (diffMs <= 0) return '0m';

    const totalMinutes = Math.round(diffMs / 60000);
    if (totalMinutes >= 60) {
      const hours = Math.floor(totalMinutes / 60);
      return `${hours}h`;
    }
    return `${totalMinutes}m`;
  }

  function formatAmount(amount: number, label: string) {
    const sign = amount >= 0 ? '+' : '';
    return `${sign}${amount} ${label}`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!hasName) return;

    let activity: Activity;

    if (matchedActivity) {
      activity = matchedActivity;
    } else {
      activity = {
        id: crypto.randomUUID(),
        name: trimmedName,
        category,
        tier,
        createdAt: new Date().toISOString(),
      };
    }

    if (!isDaily && totalMinutes <= 0) {
      return;
    }

    const when = new Date();

    await logActivity({
      activity,
      when,
      minutes: totalMinutes,
    });

    setName('');
    onClose();
  }

  const uiCategory = matchedActivity?.category ?? category;
  const uiTier = matchedActivity?.tier ?? tier;
  const disableCategoryTier = !!matchedActivity;

  return (
    <div
      className="bottom-sheet-backdrop"
      onClick={onClose}
    >
      <div
        className="add-activity-wrapper"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bottom-sheet">
          <h2 className="section-title">Log completed activity</h2>

          <form onSubmit={handleSubmit}>
            {/* Name */}
            <div className="add-activity-field">
              <div className="field-label">Name</div>
              <input
                ref={nameInputRef}
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onFocus={() => setNameFocused(true)}
                onBlur={() => setNameFocused(false)}
                placeholder="Type activity name..."
                autoComplete="off"
              />

              {nameFocused && suggestions.length > 0 && (
                <div className="add-activity-suggestions">
                  {suggestions.map((a) => (
                    <div
                      key={a.id}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setName(a.name);
                        setNameFocused(false);
                        if (nameInputRef.current) {
                          nameInputRef.current.blur();
                        }
                      }}
                      className="add-activity-suggestion-item"
                    >
                      <span>{a.name}</span>
                      <span className="add-activity-suggestion-meta">
                        {a.category}/{a.tier}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {matchedActivity && (
                <div className="add-activity-preset-note">
                  Using preset: {matchedActivity.category}/{matchedActivity.tier}
                </div>
              )}
            </div>

            {/* Category & tier */}
            <div className="add-activity-row">
              <select
                className="select"
                value={uiCategory}
                disabled={disableCategoryTier}
                onChange={(e) =>
                  setCategory(e.target.value as ActivityCategory)
                }
              >
                <option value="daily">Daily</option>
                <option value="productive">Productive</option>
                <option value="unproductive">Unproductive</option>
              </select>

              <select
                className="select"
                value={uiTier}
                disabled={disableCategoryTier}
                onChange={(e) =>
                  setTier(e.target.value as ActivityTier)
                }
              >
                {tiersForCategory[uiCategory].map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Duration – only for non-daily */}
            {!isDaily && (
              <div className="add-activity-field add-activity-field--duration">
                <div className="field-label">Duration</div>
                <select
                  className="select"
                  value={String(totalMinutes)}
                  onChange={(e) => {
                    const total = Number(e.target.value);
                    const h = Math.floor(total / 60);
                    const m = total % 60;
                    setHours(h);
                    setMins(m);
                  }}
                >
                  {DURATION_OPTIONS.map((minsTotal) => (
                    <option key={minsTotal} value={minsTotal}>
                      {formatDurationLabel(minsTotal)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {isDaily && (
              <div className="add-activity-daily-note">
                Daily activities give a fixed reward. No time needed.
              </div>
            )}

            {/* Reward preview */}
            {previewReward && (
              <div className="reward-preview">
                <div className="reward-preview-title">
                  Result
                </div>
                <div>
                  <CoinsDisplay amount={previewReward.coins} showPlus />
                  {' · '}
                  {formatAmount(previewReward.xp, 'XP')}
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="add-activity-actions">
              <button
                type="button"
                className="button-ghost add-activity-action"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="button-primary add-activity-action"
                disabled={hasDurationError || !hasName}
              >
                Log activity
              </button>
            </div>
          </form>
        </div>

        {/* Effects BELOW the bottom-sheet */}
        {state.activeEffects.length > 0 && (
          <div className="active-effects-bar">
            {state.activeEffects.map((eff) => {
              const meta = REWARD_META[eff.rewardType];
              const remaining = formatRemainingTime(eff.expiresAt);
              const isOpen = openEffectId === eff.id;

              return (
                <div
                  key={eff.id}
                  className="active-effects-item"
                >
                  <button
                    type="button"
                    className="active-effects-icon-button"
                    onClick={() =>
                      setOpenEffectId(isOpen ? null : eff.id)
                    }
                  >
                    <div className=".wow-tooltip-iconinner">
                      <img
                        src={assetUrl(meta.icon)}
                        alt={meta.name}
                        width={36}
                        height={36}
                      />
                    </div>
                    <div className="active-effects-remaining">
                      {remaining}
                    </div>
                  </button>

                  {isOpen && (
                    <div className="wow-tooltip active-effects-tooltip">
                      <div className="wow-tooltip-title">
                        {meta.name}
                      </div>
                      <div className="wow-tooltip-body">
                        {meta.useDescription}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
