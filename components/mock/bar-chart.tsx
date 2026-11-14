import { useId } from 'react';

export interface BarSeries {
  label: string;
  /** A CSS colour: a variable of `tokens.css`. */
  color: string;
}

export interface BarGroup {
  label: string;
  values: number[];
  /** A word over an empty bar: "Đóng". */
  mark?: string;
}

const WIDTH = 760;
const LEFT = 44;
const TOP = 10;
const BOTTOM = 24;

/** The step of the axis: 1, 2, 2,5 or 5 times a power of ten, so four steps cover the biggest bar. */
function niceStep(max: number) {
  const raw = max / 4;
  if (raw <= 0) return 1;
  const power = 10 ** Math.floor(Math.log10(raw));
  const unit = raw / power;
  const mult = unit <= 1 ? 1 : unit <= 2 ? 2 : unit <= 2.5 ? 2.5 : unit <= 5 ? 5 : 10;
  return mult * power;
}

/**
 * Bars drawn as SVG, one group per label and one bar per series. With no `axisMax` the axis
 * reaches the first nice number above the biggest bar.
 */
export function BarChart({
  title,
  unit,
  series,
  groups,
  height = 220,
  width = WIDTH,
  axisMax,
  format = (n) => String(n),
}: {
  title: string;
  unit?: string;
  series: BarSeries[];
  groups: BarGroup[];
  height?: number;
  width?: number;
  axisMax?: number;
  format?: (value: number) => string;
}) {
  const id = useId();
  const biggest = Math.max(0, ...groups.flatMap((g) => g.values));
  const step = axisMax !== undefined ? axisMax / 4 : niceStep(biggest);
  const max = axisMax ?? step * 4;
  const plotHeight = height - TOP - BOTTOM;
  const y = (v: number) => TOP + plotHeight - (Math.max(0, v) / max) * plotHeight;
  const slot = (width - LEFT) / Math.max(1, groups.length);
  const bar = Math.min(18, (slot - 12) / Math.max(1, series.length) - 3);
  const cluster = series.length * bar + (series.length - 1) * 3;

  return (
    <figure className="m-0 flex flex-col gap-2" aria-labelledby={`${id}-c`}>
      <figcaption id={`${id}-c`} className="text-[15px] leading-[22px] font-semibold">
        {title}
        {unit && <span className="font-normal text-(--ink-muted)"> ({unit})</span>}
      </figcaption>
      {series.length > 1 && (
        <div className="flex gap-4 text-[13px] leading-[18px] text-(--ink-muted)">
          {series.map((s) => (
            <span key={s.label} className="inline-flex items-center gap-1.5">
              <span
                className="size-2.5 rounded-[3px]"
                style={{ background: s.color }}
                aria-hidden="true"
              />
              {s.label}
            </span>
          ))}
        </div>
      )}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        role="img"
        aria-label={`${title}: ${groups
          .map((g) => `${g.label} ${g.mark ?? g.values.map(format).join(' / ')}`)
          .join(', ')}`}
      >
        {[0, 1, 2, 3, 4].map((i) => {
          const value = step * i;
          return (
            <g key={i}>
              <line x1={LEFT} x2={width} y1={y(value)} y2={y(value)} stroke="var(--line)" />
              <text
                x={LEFT - 6}
                y={y(value) + 4}
                textAnchor="end"
                fontSize="11"
                fill="var(--ink-muted)"
              >
                {Number.isInteger(value) ? value : value.toFixed(1)}
              </text>
            </g>
          );
        })}
        {groups.map((g, gi) => {
          const x0 = LEFT + gi * slot + (slot - cluster) / 2;
          return (
            <g key={g.label}>
              {g.values.map((v, si) => (
                <rect
                  key={series[si]?.label ?? si}
                  x={x0 + si * (bar + 3)}
                  y={y(v)}
                  width={bar}
                  height={Math.max(0, TOP + plotHeight - y(v))}
                  rx="3"
                  fill={series[si]?.color ?? 'var(--brand)'}
                />
              ))}
              {g.mark && (
                <text
                  x={LEFT + gi * slot + slot / 2}
                  y={TOP + plotHeight - 6}
                  textAnchor="middle"
                  fontSize="11"
                  fill="var(--ink-muted)"
                >
                  {g.mark}
                </text>
              )}
              <text
                x={LEFT + gi * slot + slot / 2}
                y={height - 6}
                textAnchor="middle"
                fontSize="12"
                fill="var(--ink-muted)"
              >
                {g.label}
              </text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}
