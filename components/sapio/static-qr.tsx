const SIZE = 25;

/** A fixed pattern from `value`; it looks like a transfer QR and encodes nothing. */
function modules(value: string): boolean[][] {
  let seed = 2166136261;
  for (const ch of value) seed = Math.imul(seed ^ ch.charCodeAt(0), 16777619) >>> 0;
  const next = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
  const grid = Array.from({ length: SIZE }, () => Array.from({ length: SIZE }, () => next() < 0.5));
  const finder = (row: number, col: number) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const y = row + r;
        const x = col + c;
        if (y < 0 || x < 0 || y >= SIZE || x >= SIZE) continue;
        const ring = r === 0 || r === 6 || c === 0 || c === 6;
        const core = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        grid[y]![x] = r >= 0 && r <= 6 && c >= 0 && c <= 6 && (ring || core);
      }
    }
  };
  finder(0, 0);
  finder(0, SIZE - 7);
  finder(SIZE - 7, 0);
  return grid;
}

/** Static QR for the deposit transfer (MH-15). */
export function StaticQr({ value, label }: { value: string; label: string }) {
  const grid = modules(value);
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`-2 -2 ${SIZE + 4} ${SIZE + 4}`}
      className="size-44 rounded-(--radius-md) bg-(--surface) text-(--ink)"
      shapeRendering="crispEdges"
    >
      {grid.flatMap((row, y) =>
        row.map((on, x) =>
          on ? (
            <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="currentColor" />
          ) : null,
        ),
      )}
    </svg>
  );
}
