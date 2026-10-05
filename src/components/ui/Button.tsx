import {
  Children,
  forwardRef,
  isValidElement,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type PropsWithChildren,
  type ReactNode,
} from 'react';
import { Loader, buttonVariants } from '@cloudflare/kumo';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'md' | 'sm';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
}

const KUMO_VARIANT = {
  primary: 'primary',
  secondary: 'secondary',
  ghost: 'ghost',
  danger: 'destructive',
} as const;

const EMPHASIS_TOKEN: Partial<Record<ButtonVariant, string>> = {
  primary: 'var(--color-kumo-brand)',
  danger: 'var(--color-kumo-danger)',
};

const emphasisStyle = (token: string): CSSProperties =>
  ({
    '--kumo-button-emphasis-ring': `color-mix(in oklch, ${token}, black 10%)`,
    '--kumo-button-emphasis-bg': `color-mix(in oklch, ${token}, white 30%)`,
    '--kumo-button-emphasis-gradient-start': `color-mix(in oklch, ${token}, white 15%)`,
    '--kumo-button-emphasis-gradient-end': token,
  }) as CSSProperties;

const isIconOnly = (children: ReactNode, ariaLabel: string | undefined) => {
  if (!ariaLabel) return false;
  const items = Children.toArray(children);
  return items.length === 1 && isValidElement(items[0]) && typeof items[0].type !== 'string';
};

export const Button = forwardRef<HTMLButtonElement, PropsWithChildren<ButtonProps>>(
  function Button(
    {
      children,
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      loading = false,
      className = '',
      type = 'button',
      disabled,
      style,
      ...rest
    },
    ref
  ) {
    const iconOnly = isIconOnly(children, rest['aria-label']);
    const kumoSize = size === 'sm' ? 'sm' : 'base';
    const token = EMPHASIS_TOKEN[variant];
    const classes = [
      buttonVariants({
        variant: KUMO_VARIANT[variant],
        size: kumoSize,
        shape: iconOnly ? 'square' : 'base',
      }),
      'btn',
      `btn-${variant}`,
      size === 'sm' ? 'btn-sm' : '',
      fullWidth ? 'btn-full !w-full justify-center' : '',
      disabled || loading ? 'cursor-not-allowed opacity-50' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');
    const hasChildren = children !== null && children !== undefined && children !== false;
    const content = (
      <>
        {loading ? <Loader size={kumoSize === 'sm' ? 12 : 14} /> : null}
        {hasChildren ? <span className="contents">{children}</span> : null}
      </>
    );

    return (
      <button
        ref={ref}
        type={type}
        data-kumo-component="Button"
        className={classes}
        disabled={disabled || loading}
        style={token ? { ...emphasisStyle(token), ...style } : style}
        {...rest}
      >
        {token ? (
          <>
            <span
              aria-hidden="true"
              className="absolute inset-0 rounded-[inherit] bg-linear-to-b from-(--kumo-button-emphasis-gradient-start) to-(--kumo-button-emphasis-gradient-end) shadow-[inset_0_1px_0_0_var(--kumo-button-emphasis-bg)] group-hover:from-(--kumo-button-emphasis-bg)"
            />
            <span className="relative flex items-center justify-center gap-[inherit]">
              {content}
            </span>
          </>
        ) : (
          content
        )}
      </button>
    );
  }
);
