import type { PropsWithChildren, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Dialog, DialogRoot, DialogTitle } from '@cloudflare/kumo';
import { IconX } from './icons';

interface ModalProps {
  open: boolean;
  title?: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
  width?: number | string;
  className?: string;
  closeDisabled?: boolean;
}

export function Modal({
  open,
  title,
  onClose,
  footer,
  width = 520,
  className,
  closeDisabled = false,
  children,
}: PropsWithChildren<ModalProps>) {
  const { t } = useTranslation();

  return (
    <DialogRoot
      open={open}
      disablePointerDismissal
      onOpenChange={(next) => {
        if (!next && !closeDisabled) onClose();
      }}
    >
      <Dialog
        className={['flex max-h-[calc(100dvh-4rem)] flex-col sm:max-h-[calc(100dvh-8rem)]', className]
          .filter(Boolean)
          .join(' ')}
        style={{ width, maxWidth: 'calc(100vw - 2rem)' }}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-kumo-hairline py-3 pr-3 pl-5">
          {title ? (
            <DialogTitle className="min-w-0 pt-1 text-lg font-semibold text-kumo-default">
              {title}
            </DialogTitle>
          ) : (
            <span />
          )}
          <Button
            variant="ghost"
            shape="square"
            size="sm"
            icon={<IconX size={16} />}
            aria-label={t('common.close')}
            disabled={closeDisabled}
            onClick={closeDisabled ? undefined : onClose}
          />
        </div>
        <div className="modal-body min-h-0 flex-1 overflow-auto px-5 py-4 text-base">
          {children}
        </div>
        {footer ? (
          <div className="modal-footer flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-kumo-hairline bg-kumo-elevated px-5 py-3">
            {footer}
          </div>
        ) : null}
      </Dialog>
    </DialogRoot>
  );
}
