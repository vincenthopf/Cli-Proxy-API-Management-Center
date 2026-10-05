import type { ReactNode } from 'react';
import { Switch } from '@cloudflare/kumo';

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (value: boolean) => void;
  label?: ReactNode;
  ariaLabel?: string;
  disabled?: boolean;
  labelPosition?: 'left' | 'right';
}

export function ToggleSwitch({
  checked,
  onChange,
  label,
  ariaLabel,
  disabled = false,
  labelPosition = 'right',
}: ToggleSwitchProps) {
  return (
    <Switch
      checked={checked}
      onCheckedChange={(value) => onChange(value)}
      label={label || undefined}
      aria-label={ariaLabel}
      disabled={disabled}
      controlFirst={labelPosition === 'right'}
    />
  );
}
