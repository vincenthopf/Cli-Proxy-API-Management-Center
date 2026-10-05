import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { Input as KumoInput } from '@cloudflare/kumo';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  labelExtra?: ReactNode;
  topExtra?: ReactNode;
  hint?: ReactNode;
  error?: string;
  rightElement?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    labelExtra,
    topExtra,
    hint,
    error,
    rightElement,
    className = '',
    id,
    size: _size,
    ...rest
  },
  ref
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy =
    [rest['aria-describedby'], errorId, hintId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="form-group">
      {topExtra}
      {label && <label htmlFor={inputId}>{label}</label>}
      {labelExtra}
      <div className="relative">
        <KumoInput
          ref={ref}
          id={inputId}
          variant={error ? 'error' : 'default'}
          className={['input !w-full', rightElement ? 'pr-10' : '', className]
            .filter(Boolean)
            .join(' ')}
          aria-invalid={Boolean(error) || rest['aria-invalid']}
          {...rest}
          aria-label={rest['aria-label'] ?? label ?? rest.placeholder}
          aria-describedby={describedBy}
        />
        {rightElement && (
          <div className="absolute top-1/2 right-2 flex -translate-y-1/2 items-center">
            {rightElement}
          </div>
        )}
      </div>
      {hint && (
        <div id={hintId} className="hint">
          {hint}
        </div>
      )}
      {error && (
        <div id={errorId} className="error-box">
          {error}
        </div>
      )}
    </div>
  );
});
