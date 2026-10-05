import { forwardRef, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { IconChevronLeft } from '@/components/ui/icons';

export type SecondaryScreenShellProps = {
  title: ReactNode;
  onBack?: () => void;
  backLabel?: string;
  backAriaLabel?: string;
  rightAction?: ReactNode;
  isLoading?: boolean;
  loadingLabel?: ReactNode;
  className?: string;
  contentClassName?: string;
  topBarClassName?: string;
  children?: ReactNode;
};

export const SecondaryScreenShell = forwardRef<HTMLDivElement, SecondaryScreenShellProps>(
  function SecondaryScreenShell(
    {
      title,
      onBack,
      backLabel = 'Back',
      backAriaLabel,
      rightAction,
      isLoading = false,
      loadingLabel = 'Loading...',
      className = '',
      contentClassName = '',
      topBarClassName = '',
      children,
    },
    ref
  ) {
    const containerClassName = ['flex min-h-0 flex-col gap-6', className].filter(Boolean).join(' ');
    const contentClasses = ['flex flex-col gap-6', contentClassName].filter(Boolean).join(' ');
    const titleTooltip = typeof title === 'string' ? title : undefined;
    const resolvedBackAriaLabel = backAriaLabel ?? backLabel;

    return (
      <div className={containerClassName} ref={ref}>
        <div
          className={[
            'sticky top-0 z-5 grid min-h-12 grid-cols-[1fr_auto_1fr] items-center gap-4 border-b border-kumo-hairline bg-kumo-base px-4 py-2',
            topBarClassName,
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {onBack ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="justify-self-start"
              aria-label={resolvedBackAriaLabel}
            >
              <span className="inline-flex items-center">
                <IconChevronLeft size={16} />
              </span>
              <span>{backLabel}</span>
            </Button>
          ) : (
            <div />
          )}
          <div
            className="min-w-0 max-w-full justify-self-center truncate text-center text-lg font-semibold text-kumo-default"
            title={titleTooltip}
          >
            {title}
          </div>
          <div className="flex justify-end justify-self-end">{rightAction}</div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-kumo-subtle">
            <LoadingSpinner size={16} />
            <span>{loadingLabel}</span>
          </div>
        ) : (
          <div className={contentClasses}>{children}</div>
        )}
      </div>
    );
  }
);
