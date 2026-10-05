const WIDTH = 96;
const HEIGHT = 24;
const PAD = 1.5;

export interface UsageSparklineProps {
  values: number[];
  label: string;
}

export function UsageSparkline({ values, label }: UsageSparklineProps) {
  if (values.length < 2) {
    return (
      <svg width={WIDTH} height={HEIGHT} role="img" aria-label={label} className="text-kumo-line">
        <line
          x1={0}
          x2={WIDTH}
          y1={HEIGHT - PAD}
          y2={HEIGHT - PAD}
          stroke="currentColor"
          strokeWidth={1}
        />
      </svg>
    );
  }
  const max = Math.max(...values, 0);
  const step = WIDTH / (values.length - 1);
  const points = values.map((value, index) => {
    const x = index * step;
    const y = max > 0 ? HEIGHT - PAD - (value / max) * (HEIGHT - PAD * 2) : HEIGHT - PAD;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const line = points.join(' ');
  const area = `0,${HEIGHT} ${line} ${WIDTH},${HEIGHT}`;
  return (
    <svg
      width={WIDTH}
      height={HEIGHT}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label={label}
      className={max > 0 ? 'text-kumo-brand' : 'text-kumo-line'}
    >
      <polygon points={area} fill="currentColor" fillOpacity={0.12} />
      <polyline
        points={line}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
