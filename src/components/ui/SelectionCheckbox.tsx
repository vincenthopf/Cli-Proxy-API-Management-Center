import type { ReactNode } from 'react';
import { Checkbox } from '@cloudflare/kumo';

interface SelectionCheckboxProps {
  checked: boolean;
  onChange: (value: boolean) => void;
  label?: ReactNode;
  ariaLabel?: string;
  title?: string;
  disabled?: boolean;
  className?: string;
  labelClassName?: string;
}

export function SelectionCheckbox({
  checked,
  onChange,
  label,
  ariaLabel,
  title,
  disabled = false,
  className,
  labelClassName,
}: SelectionCheckboxProps) {
  return (
    <span className={['inline-flex min-w-0', className].filter(Boolean).join(' ')} title={title}>
      <Checkbox
        checked={checked}
        onCheckedChange={(value) => onChange(value === true)}
        aria-label={ariaLabel}
        disabled={disabled}
        label={
          label ? (
            <span className={['min-w-0 text-kumo-default', labelClassName].filter(Boolean).join(' ')}>
              {label}
            </span>
          ) : undefined
        }
      />
    </span>
  );
}
