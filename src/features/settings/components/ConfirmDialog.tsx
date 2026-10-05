import type { ReactNode } from 'react';
import { Button, Dialog } from '@cloudflare/kumo';

export type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  destructive = false,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Dialog.Root
      role="alertdialog"
      open={open}
      onOpenChange={(next) => {
        if (!next && !busy) onCancel();
      }}
    >
      <Dialog size="base" className="flex flex-col gap-4 p-6">
        <Dialog.Title className="text-lg font-semibold text-kumo-default">{title}</Dialog.Title>
        <Dialog.Description className="text-sm text-kumo-subtle">{description}</Dialog.Description>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" disabled={busy} onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? 'destructive' : 'primary'}
            loading={busy}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </Dialog>
    </Dialog.Root>
  );
}
