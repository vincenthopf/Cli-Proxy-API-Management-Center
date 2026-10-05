import { useMemo, type AriaAttributes } from 'react';
import { Select as KumoSelect } from '@cloudflare/kumo';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  options: ReadonlyArray<SelectOption>;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
  ariaInvalid?: AriaAttributes['aria-invalid'];
  fullWidth?: boolean;
  size?: 'sm' | 'md';
  id?: string;
}

export function Select({
  value,
  options,
  onChange,
  placeholder,
  className,
  disabled = false,
  ariaLabel,
  ariaLabelledBy,
  ariaDescribedBy,
  ariaInvalid,
  fullWidth = true,
  size = 'md',
  id,
}: SelectProps) {
  const items = useMemo(
    () => options.map((option) => ({ value: option.value, label: option.label })),
    [options]
  );
  const hasValue = options.some((option) => option.value === value);
  const invalid = ariaInvalid === true || ariaInvalid === 'true';
  const triggerClassName = [
    fullWidth ? '!w-full' : 'min-w-32',
    invalid ? '!ring-kumo-danger' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <KumoSelect<string>
      id={id}
      size={size === 'sm' ? 'sm' : 'base'}
      value={hasValue ? value : null}
      onValueChange={(next) => {
        if (typeof next === 'string') onChange(next);
      }}
      items={items}
      placeholder={placeholder}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      className={triggerClassName}
      render={<button type="button" aria-describedby={ariaDescribedBy} aria-invalid={ariaInvalid} />}
    />
  );
}
