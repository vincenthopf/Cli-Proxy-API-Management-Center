import { useCallback, type PropsWithChildren, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Dialog, DialogDescription, DialogRoot, DialogTitle } from '@cloudflare/kumo';
import { IconX } from '../icons';

export type SheetSize = 'md' | 'lg' | 'xl';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  size?: SheetSize;
  eyebrow?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  closeDisabled?: boolean;
  className?: string;
  ariaLabel?: string;
  confirmClose?: () => boolean | Promise<boolean>;
}

const SIZE_WIDTH: Record<SheetSize, string> = {
  md: 'min(640px, 100vw)',
  lg: 'min(720px, 100vw)',
  xl: 'min(960px, 100vw)',
};

const SHEET_CLASSES = [
  'flex flex-col',
  '!top-0 sm:!top-0 !right-0 !bottom-0 !left-auto !h-dvh !max-w-full !translate-x-0',
  '!rounded-none sm:!rounded-l-xl',
  'data-starting-style:!scale-100 data-ending-style:!scale-100',
  'data-starting-style:!translate-x-full data-ending-style:!translate-x-full',
  'data-starting-style:!opacity-100 data-ending-style:!opacity-100',
  'motion-reduce:!transition-none',
].join(' ');

export function Sheet({
  open,
  onClose,
  size = 'md',
  eyebrow,
  title,
  description,
  footer,
  closeDisabled = false,
  className,
  ariaLabel,
  confirmClose,
  children,
}: PropsWithChildren<SheetProps>) {
  const { t } = useTranslation();

  const requestClose = useCallback(async () => {
    if (closeDisabled) return;
    if (confirmClose) {
      try {
        const ok = await confirmClose();
        if (ok === false) return;
      } catch {
        return;
      }
    }
    onClose();
  }, [closeDisabled, confirmClose, onClose]);

  const hasHeader = Boolean(eyebrow || title || description);

  return (
    <DialogRoot
      open={open}
      disablePointerDismissal={closeDisabled}
      onOpenChange={(next) => {
        if (!next) void requestClose();
      }}
    >
      <Dialog
        className={[SHEET_CLASSES, className].filter(Boolean).join(' ')}
        style={{
          width: SIZE_WIDTH[size],
          transitionProperty: 'translate',
          transitionDuration: '240ms',
          transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {!title && ariaLabel ? <DialogTitle className="sr-only">{ariaLabel}</DialogTitle> : null}
        <div
          className={[
            'flex shrink-0 items-start justify-between gap-4 py-4 pr-3 pl-6',
            hasHeader ? 'border-b border-kumo-hairline' : '',
          ].join(' ')}
        >
          <div className="flex min-w-0 flex-col gap-1">
            {eyebrow ? (
              <div className="text-xs font-medium tracking-wide text-kumo-subtle uppercase">
                {eyebrow}
              </div>
            ) : null}
            {title ? (
              <DialogTitle className="m-0 text-lg font-semibold text-kumo-default">
                {title}
              </DialogTitle>
            ) : null}
            {description ? (
              <DialogDescription className="m-0 text-sm text-kumo-subtle">
                {description}
              </DialogDescription>
            ) : null}
          </div>
          <Button
            variant="ghost"
            shape="square"
            size="sm"
            icon={<IconX size={16} />}
            aria-label={t('common.close')}
            disabled={closeDisabled}
            onClick={() => void requestClose()}
          />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">{children}</div>
        {footer ? (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-kumo-hairline bg-kumo-elevated px-4 py-3 sm:px-6">
            {footer}
          </div>
        ) : null}
      </Dialog>
    </DialogRoot>
  );
}
