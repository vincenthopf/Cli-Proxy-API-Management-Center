import { toneForSuccessRate, type MeterTone } from '../utils';
import styles from './Meter.module.scss';

const TONE_COLORS: Record<MeterTone, string> = {
  good: 'var(--color-kumo-success)',
  warning: 'var(--color-kumo-warning)',
  critical: 'var(--color-kumo-danger)',
  idle: 'var(--color-kumo-interact)',
};

interface MeterProps {
  value: number | null;
  tone?: MeterTone;
  ariaLabel: string;
  className?: string;
}

export function Meter({ value, tone, ariaLabel, className }: MeterProps) {
  const resolvedTone = tone ?? toneForSuccessRate(value);
  const clamped = value === null ? 0 : Math.max(0, Math.min(100, value));

  return (
    <div
      className={[styles.track, className].filter(Boolean).join(' ')}
      style={{ '--meter-fill': TONE_COLORS[resolvedTone] } as React.CSSProperties}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value === null ? undefined : Math.round(clamped)}
      aria-label={ariaLabel}
    >
      <div className={styles.fill} style={{ width: `${clamped}%` }} />
    </div>
  );
}
