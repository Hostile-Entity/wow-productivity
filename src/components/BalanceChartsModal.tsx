import React, { useEffect, useRef } from 'react';
import './BalanceChartsModal.css';
import type { DailyBalancePoint } from '../types';
import { formatCoinsGoldSilver } from '../utils/coins';

interface Props {
  open: boolean;
  onClose(): void;
  balances: DailyBalancePoint[];
  earned: DailyBalancePoint[];
  spent: DailyBalancePoint[];
}

export const BalanceChartsModal: React.FC<Props> = ({
  open,
  onClose,
  balances,
  earned,
  spent,
}) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const allBalancePoints =
    (balances as Array<{ balance: number; date?: string; day?: string }>) || [];
  const balancePoints = allBalancePoints.slice(-30);

  const allEarnedPoints =
    (earned as Array<{ balance: number; date?: string; day?: string }>) || [];
  const earnedPoints = allEarnedPoints.slice(-30);

  const allSpentPoints =
    (spent as Array<{ balance: number; date?: string; day?: string }>) || [];
  const spentPoints = allSpentPoints.slice(-30);

  const height = 120;
  const basePaddingX = 24;
  const stepX = 40;

  const seriesLength =
    balancePoints.length || earnedPoints.length || spentPoints.length || 0;

  const width = Math.max(
    260,
    basePaddingX * 2 + Math.max(0, seriesLength - 1) * stepX,
  );

  const balanceMax =
    balancePoints.length > 0
      ? Math.max(10, ...balancePoints.map((p) => p.balance))
      : 10;

  const balancePath =
    balancePoints.length > 0
      ? balancePoints
          .map((p, idx) => {
            const x =
              balancePoints.length === 1
                ? width / 2
                : basePaddingX + idx * stepX;
            const y = height - 34 - (p.balance / balanceMax) * (height - 60);
            return `${idx === 0 ? 'M' : 'L'}${x},${y}`;
          })
          .join(' ')
      : '';

  const balanceCircles = balancePoints.map((p, idx) => {
    const x =
      balancePoints.length === 1
        ? width / 2
        : basePaddingX + idx * stepX;
    const y = height - 34 - (p.balance / balanceMax) * (height - 60);
    return { x, y, value: p.balance };
  });

  const formatDayLabel = (raw: string): string => {
    const isoDate = raw.slice(0, 10);
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
    if (!match) return raw;

    const month = Number(match[2]);
    const day = Number(match[3]);
    if (!Number.isFinite(month) || !Number.isFinite(day)) return raw;

    return `${month}/${day}`;
  };

  const labels = balancePoints.map((p, idx) => {
    const x =
      balancePoints.length === 1
        ? width / 2
        : basePaddingX + idx * stepX;

    let raw = p.date ?? p.day ?? '';
    let label = raw;

    if (raw && raw.length >= 10) {
      label = formatDayLabel(raw);
    }

    if (!label) {
      label = `D${allBalancePoints.length - balancePoints.length + idx + 1}`;
    }

    return { x, label };
  });

  const earnedMax =
    earnedPoints.length > 0
      ? Math.max(10, ...earnedPoints.map((p) => p.balance))
      : 10;

  const earnedPath =
    earnedPoints.length > 0
      ? earnedPoints
          .map((p, idx) => {
            const x =
              earnedPoints.length === 1
                ? width / 2
                : basePaddingX + idx * stepX;
            const y = height - 34 - (p.balance / earnedMax) * (height - 60);
            return `${idx === 0 ? 'M' : 'L'}${x},${y}`;
          })
          .join(' ')
      : '';

  const earnedCircles = earnedPoints.map((p, idx) => {
    const x =
      earnedPoints.length === 1
        ? width / 2
        : basePaddingX + idx * stepX;
    const y = height - 34 - (p.balance / earnedMax) * (height - 60);
    return { x, y, value: p.balance };
  });

  const spentMax =
    spentPoints.length > 0
      ? Math.max(10, ...spentPoints.map((p) => p.balance))
      : 10;

  const spentPath =
    spentPoints.length > 0
      ? spentPoints
          .map((p, idx) => {
            const x =
              spentPoints.length === 1
                ? width / 2
                : basePaddingX + idx * stepX;
            const y = height - 34 - (p.balance / spentMax) * (height - 60);
            return `${idx === 0 ? 'M' : 'L'}${x},${y}`;
          })
          .join(' ')
      : '';

  const spentCircles = spentPoints.map((p, idx) => {
    const x =
      spentPoints.length === 1
        ? width / 2
        : basePaddingX + idx * stepX;
    const y = height - 34 - (p.balance / spentMax) * (height - 60);
    return { x, y, value: p.balance };
  });

  useEffect(() => {
    if (!open) return;
    const el = scrollRef.current;
    if (el) {
      el.scrollLeft = el.scrollWidth;
    }
  }, [open, balancePoints.length]);

  if (!open) return null;

  const hasData = balancePoints.length > 0;

  return (
    <div
      className="balance-modal-backdrop"
      onClick={onClose}
    >
      <div
        className="panel balance-modal-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="balance-modal-header">
          <div className="section-title section-title--tight">
            Balance history (last 30 days)
          </div>
          <button className="button-ghost" type="button" onClick={onClose}>
            Close
          </button>
        </div>

        <div
          ref={scrollRef}
          className="balance-modal-scroll"
        >
          {!hasData ? (
            <div className="small-muted-text">
              No days logged yet.
            </div>
          ) : (
            <div style={{ minWidth: width }}>
              {/* 1) Balance chart */}
              <div className="balance-chart-title">
                Balance (last 30 days)
              </div>
              <svg width={width} height={height} style={{ display: 'block' }}>
                <line
                  x1={0}
                  x2={width}
                  y1={height - 30}
                  y2={height - 30}
                  stroke="#555"
                  strokeWidth={1}
                />

                {balancePath && (
                  <path
                    d={balancePath}
                    fill="none"
                    stroke="#f7d87b"
                    strokeWidth={0.5}
                    strokeLinejoin="round"
                  />
                )}

                {balanceCircles.map((c, idx) => (
                  <g key={idx}>
                    <circle
                      cx={c.x}
                      cy={c.y}
                      r={3}
                      fill="#f7d87b"
                      stroke="#000"
                      strokeWidth={1}
                    />
                    <text
                      x={c.x}
                      y={c.y - 6}
                      fontSize={11}
                      textAnchor="middle"
                      fill="#f7d87b"
                    >
                      {formatCoinsGoldSilver(c.value)}
                    </text>
                  </g>
                ))}

                {labels.map((l, idx) => (
                  <text
                    key={idx}
                    x={l.x}
                    y={height - 16}
                    fontSize={9}
                    textAnchor="middle"
                    fill="var(--wow-text-muted)"
                  >
                    {l.label}
                  </text>
                ))}
              </svg>

              {/* 2) Daily earned chart */}
              <div className="balance-chart-title balance-chart-title--spaced">
                Daily earned (last 30 days)
              </div>
              <svg width={width} height={height} style={{ display: 'block' }}>
                <line
                  x1={0}
                  x2={width}
                  y1={height - 30}
                  y2={height - 30}
                  stroke="#555"
                  strokeWidth={1}
                />

                {earnedPath && (
                  <path
                    d={earnedPath}
                    fill="none"
                    stroke="#6df76d"
                    strokeWidth={0.5}
                    strokeLinejoin="round"
                  />
                )}

                {earnedCircles.map((c, idx) => (
                  <g key={idx}>
                    <circle
                      cx={c.x}
                      cy={c.y}
                      r={3}
                      fill="#6df76d"
                      stroke="#000"
                      strokeWidth={1}
                    />
                    {c.value !== 0 && (
                      <text
                        x={c.x}
                        y={c.y - 6}
                        fontSize={11}
                        textAnchor="middle"
                        fill="#6df76d"
                      >
                        {formatCoinsGoldSilver(c.value)}
                      </text>
                    )}
                  </g>
                ))}

                {labels.map((l, idx) => (
                  <text
                    key={idx}
                    x={l.x}
                    y={height - 16}
                    fontSize={9}
                    textAnchor="middle"
                    fill="var(--wow-text-muted)"
                  >
                    {l.label}
                  </text>
                ))}
              </svg>

              {/* 3) Daily spent chart */}
              <div className="balance-chart-title balance-chart-title--spaced">
                Daily spent (last 30 days)
              </div>
              <svg width={width} height={height} style={{ display: 'block' }}>
                <line
                  x1={0}
                  x2={width}
                  y1={height - 30}
                  y2={height - 30}
                  stroke="#555"
                  strokeWidth={1}
                />

                {spentPath && (
                  <path
                    d={spentPath}
                    fill="none"
                    stroke="#f06464"
                    strokeWidth={0.5}
                    strokeLinejoin="round"
                  />
                )}

                {spentCircles.map((c, idx) => (
                  <g key={idx}>
                    <circle
                      cx={c.x}
                      cy={c.y}
                      r={3}
                      fill="#f06464"
                      stroke="#000"
                      strokeWidth={1}
                    />
                    {c.value !== 0 && (
                      <text
                        x={c.x}
                        y={c.y - 6}
                        fontSize={11}
                        textAnchor="middle"
                        fill="#f06464"
                      >
                        {formatCoinsGoldSilver(c.value)}
                      </text>
                    )}
                  </g>
                ))}

                {labels.map((l, idx) => (
                  <text
                    key={idx}
                    x={l.x}
                    y={height - 16}
                    fontSize={9}
                    textAnchor="middle"
                    fill="var(--wow-text-muted)"
                  >
                    {l.label}
                  </text>
                ))}
              </svg>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
