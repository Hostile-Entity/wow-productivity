import React, { useState } from 'react';
import { useGame } from '../state/GameStore';
import type { ActivityCategory, ActivityTier } from '../types';

export const ActivitiesTab: React.FC = () => {
  const { state, addOrUpdateActivity, removeActivity } = useGame();
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ActivityCategory>('productive');
  const [tier, setTier] = useState<ActivityTier>('green');

  const tiersForCategory: Record<ActivityCategory, ActivityTier[]> = {
    daily: ['minor', 'major'],
    productive: ['gray', 'green', 'yellow', 'orange', 'red'],
    unproductive: ['idle', 'time-sink'],
  };

  const categoryOrder: ActivityCategory[] = ['daily', 'productive', 'unproductive'];

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await addOrUpdateActivity({ name: name.trim(), category, tier });
    setName('');
  }

  function handleCategoryChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newCategory = e.target.value as ActivityCategory;
    setCategory(newCategory);

    const allowedTiers = tiersForCategory[newCategory];
    // Always snap to the first valid tier for that category
    setTier(allowedTiers[0]);
  }

  return (
    <div className="panel tab-panel" style={{ padding: 8 }}>
      <h2 className="section-title">Activities</h2>

      {/* Add new activity */}
      <form onSubmit={handleAdd} style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New activity"
          />
        </div>
        <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
          <select
            className="select"
            value={category}
            onChange={handleCategoryChange}
          >
            <option value="daily">Daily</option>
            <option value="productive">Productive</option>
            <option value="unproductive">Unproductive</option>
          </select>
          <select
            className="select"
            value={tier}
            onChange={(e) => setTier(e.target.value as ActivityTier)}
          >
            {tiersForCategory[category].map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <button className="button-primary" type="submit" style={{ width: '100%' }}>
          Add activity
        </button>
      </form>

      {/* Activities list – grouped by category & tier */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          paddingBottom: 80, // keep last items above the + button
        }}
      >
        {state.activities.length === 0 && (
          <div style={{ fontSize: 12, color: 'var(--wow-text-muted)' }}>
            No activities yet. Add some above.
          </div>
        )}

        {categoryOrder.map((cat) => {
          const catItems = state.activities.filter((a) => a.category === cat);
          if (!catItems.length) return null;

          const tierOrder = tiersForCategory[cat];

          const sortedCatItems = [...catItems].sort((a, b) => {
            const aTier = a.tier as ActivityTier;
            const bTier = b.tier as ActivityTier;
            const aIdx = tierOrder.indexOf(aTier);
            const bIdx = tierOrder.indexOf(bTier);

            if (aIdx !== bIdx) {
              if (aIdx === -1) return 1;
              if (bIdx === -1) return -1;
              return aIdx - bIdx;
            }

            return a.name.localeCompare(b.name);
          });

          const tiersInCat = Array.from(
            new Set(sortedCatItems.map((a) => a.tier as ActivityTier))
          ).sort((ta, tb) => {
            const ia = tierOrder.indexOf(ta);
            const ib = tierOrder.indexOf(tb);
            if (ia === ib) return String(ta).localeCompare(String(tb));
            if (ia === -1) return 1;
            if (ib === -1) return -1;
            return ia - ib;
          });

          return (
            <div key={cat} style={{ marginBottom: 8 }}>
              {/* Category header tag */}
              <div
                style={{
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  color: 'var(--wow-text-muted)',
                  padding: '4px 2px',
                  borderBottom: '1px solid var(--wow-border-soft)',
                  marginBottom: 4,
                }}
              >
                {cat} ({catItems.length})
              </div>

              {tiersInCat.map((t) => {
                const tierItems = sortedCatItems.filter((a) => a.tier === t);
                if (!tierItems.length) return null;

                return (
                  <div key={`${cat}-${t}`} style={{ marginBottom: 4 }}>
                    <div
                      style={{
                        fontSize: 11,
                        color: 'var(--wow-text-muted)',
                        padding: '2px 2px',
                      }}
                    >
                      {t}
                    </div>

                    {tierItems.map((a) => (
                      <div
                        key={a.id}
                        className="panel"
                        style={{
                          padding: 6,
                          marginBottom: 2,
                          borderColor: 'var(--wow-border-soft)',
                        }}
                      >
                        <div className="card-row">
                          <div>
                            <div className="card-title">{a.name}</div>
                            <div className="card-subtitle">
                              {a.category} / {a.tier}
                            </div>
                          </div>
                          <button
                          className="button-ghost"
                          type="button"
                          onClick={() => {
                            const ok = confirm(
                              `Delete this activity?\n\n${a.name} (${a.category}/${a.tier})`
                            );
                            if (ok) {
                              void removeActivity(a.id);
                            }
                          }}
                        >
                          Delete
                        </button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};
