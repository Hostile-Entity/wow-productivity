import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../state/GameStore';
import type { Activity, ActivityCategory, ActivityTier, LogEntry } from '../types';
import { rewardFor } from '../config/activities';
import { getUnproductiveMinutesSoFar } from '../state/gameLogic';
import { applyEffectsToReward } from '../config/effects';
import { REWARD_META } from '../config/rewards';
import { assetUrl } from '../utils/assets';


interface Props {
  open: boolean;
  onClose(): void;
}

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

  if (!open) return null;

  const activities = state.activities;

  const tiersForCategory: Record<ActivityCategory, ActivityTier[]> = {
    daily: ['minor', 'major'],
    productive: ['gray', 'green', 'yellow', 'orange', 'red'],
    unproductive: ['idle', 'time-sink'],
  };

  const trimmedName = name.trim();

  // Always keep activities sorted alphabetically by name
  const sortedActivities = [...activities].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  let suggestions: Activity[] = [];

  if (trimmedName.length === 0) {
    // Empty input: show first N alphabetically
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
      {/* Inner wrapper so we control layout (column) */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '100%',
          transform: 'translateY(-16vh)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Bottom sheet itself */}
        <div className="bottom-sheet">
          <h2 className="section-title">Log completed activity</h2>
  
          <form onSubmit={handleSubmit}>
            {/* Name */}
            <div style={{ marginBottom: 6, position: 'relative' }}>
              <div
                style={{
                  fontSize: 12,
                  color: 'var(--wow-text-muted)',
                  marginBottom: 2,
                }}
              >
                Name
              </div>
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
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    top: '100%',
                    marginTop: 2,
                    maxHeight: 160,
                    overflowY: 'auto',
                    background: 'var(--wow-panel-inner)',
                    border: '1px solid var(--wow-border-soft)',
                    borderRadius: 4,
                    zIndex: 20,
                    fontSize: 12,
                  }}
                >
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
                      style={{
                        padding: '4px 6px',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                    >
                      <span>{a.name}</span>
                      <span
                        style={{
                          fontSize: 10,
                          color: 'var(--wow-text-muted)',
                        }}
                      >
                        {a.category}/{a.tier}
                      </span>
                    </div>
                  ))}
                </div>
              )}
  
              {matchedActivity && (
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--wow-text-muted)',
                    marginTop: 2,
                  }}
                >
                  Using preset: {matchedActivity.category}/{matchedActivity.tier}
                </div>
              )}
            </div>
  
            {/* Category & tier */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
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
              <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 12,
                      color: 'var(--wow-text-muted)',
                      marginBottom: 2,
                    }}
                  >
                    Hours
                  </div>
                  <select
                    className="select"
                    value={hours}
                    onChange={(e) => setHours(Number(e.target.value))}
                  >
                    {[0, 1, 2, 3, 4].map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 12,
                      color: 'var(--wow-text-muted)',
                      marginBottom: 2,
                    }}
                  >
                    Minutes
                  </div>
                  <select
                    className="select"
                    value={mins}
                    onChange={(e) => setMins(Number(e.target.value))}
                  >
                    {[0, 15, 30, 45].map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
  
            {isDaily && (
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--wow-text-muted)',
                  marginBottom: 8,
                }}
              >
                Daily activities give a fixed reward. No time needed.
              </div>
            )}
  
            {/* Reward preview */}
            {previewReward && (
              <div
                className="reward-preview"
                style={{
                  marginBottom: 8,
                  padding: 6,
                  borderRadius: 4,
                  border: '1px solid var(--wow-border-soft)',
                  background: 'rgba(0, 0, 0, 0.35)',
                  fontSize: 12,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--wow-gold)',
                    marginBottom: 2,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}
                >
                  Result
                </div>
                <div>
                  {formatAmount(previewReward.coins, 'coins')}
                  {' · '}
                  {formatAmount(previewReward.xp, 'XP')}
                </div>
              </div>
            )}
  
            {/* Buttons */}
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <button
                type="button"
                className="button-ghost"
                style={{ flex: 1 }}
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="button-primary"
                style={{ flex: 1 }}
                disabled={hasDurationError || !hasName}
              >
                Log activity
              </button>
            </div>
          </form>
        </div>
  
        {/* Effects BELOW the bottom-sheet */}
      {state.activeEffects.length > 0 && (
        <div
          className="active-effects-bar"
          style={{
            alignSelf: 'stretch',
            width: '100%',
            boxSizing: 'border-box',
            padding: '6px 12px 10px',
            marginTop: 8,
            marginBottom: 8,

            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            alignItems: 'center',
            alignContent: 'center',
            rowGap: 6,
            columnGap: 8,

            // enough room for at least 2 icon rows
            minHeight: 80,
            overflow: 'visible',
          }}
        >
          {state.activeEffects.map((eff) => {
            const meta = REWARD_META[eff.rewardType];
            const remaining = formatRemainingTime(eff.expiresAt);
            const isOpen = openEffectId === eff.id;

            return (
              <div
                key={eff.id}
                style={{
                  position: 'relative',
                  flex: '0 0 auto',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                <button
                  type="button"
                  onClick={() =>
                    setOpenEffectId(isOpen ? null : eff.id)
                  }
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                  }}
                >
                  <div className=".wow-tooltip-iconinner">
                      <img
                        src={assetUrl(meta.icon)}
                        alt={meta.name}
                        width={36}
                        height={36}
                      />
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: 'var(--wow-text-muted)',
                      textAlign: 'center',
                      marginTop: 2,
                    }}
                  >
                    {remaining}
                  </div>
                </button>

                {isOpen && (
                  <div
                    className="wow-tooltip"
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      marginTop: 4,
                      zIndex: 30,
                      maxWidth: 240,
                    }}
                  >
                    <div
                      className="wow-tooltip-title"
                      style={{ marginBottom: 4 }}
                    >
                      {meta.name}
                    </div>
                    <div
                      className="wow-tooltip-body"
                      style={{ fontSize: 12 }}
                    >
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
