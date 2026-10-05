import { useRef } from 'react';
import { ChartPalette, TimeseriesChart } from '@cloudflare/kumo';
import { echarts } from '@/features/usage/echarts';
import { useChartFont } from '@/features/usage/useChartFont';

interface MetricCardProps {
  label: string;
  value: string;
  hint?: string;
  points: Array<[number, number]>;
  seriesName: string;
  daily: boolean;
  isDarkMode: boolean;
  colorIndex: number;
  formatValue: (value: number) => string;
  description: string;
  loading?: boolean;
  minInterval?: number;
}

export function MetricCard({
  label,
  value,
  hint,
  points,
  seriesName,
  daily,
  isDarkMode,
  colorIndex,
  formatValue,
  description,
  loading,
  minInterval,
}: MetricCardProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  useChartFont(chartRef, `${points.length}:${isDarkMode}:${loading}`);
  return (
    <section
      aria-label={label}
      className="grid grid-cols-1 items-center gap-4 rounded-lg border border-kumo-line bg-kumo-base p-4 md:grid-cols-[200px_minmax(0,1fr)] md:gap-6 md:p-5"
    >
      <div className="flex min-w-0 flex-col gap-1">
        <h3 className="text-sm font-medium text-kumo-default">{label}</h3>
        <p className="text-3xl font-semibold tabular-nums text-kumo-strong">{value}</p>
        {hint ? <p className="text-sm text-kumo-subtle">{hint}</p> : null}
      </div>
      <div className="min-w-0" ref={chartRef}>
        <TimeseriesChart
          echarts={echarts}
          isDarkMode={isDarkMode}
          type="line"
          gradient
          height={120}
          loading={loading}
          yAxisTickCount={3}
          yAxisMinInterval={minInterval}
          xAxisTickCount={6}
          data={[
            {
              name: seriesName,
              color: ChartPalette.categorical(colorIndex, isDarkMode),
              data: points,
            },
          ]}
          xAxisTickFormat={(time) =>
            new Date(time).toLocaleString(
              undefined,
              daily ? { month: 'short', day: 'numeric' } : { hour: 'numeric' }
            )
          }
          yAxisTickFormat={formatValue}
          tooltipValueFormat={formatValue}
          ariaDescription={description}
        />
      </div>
    </section>
  );
}
