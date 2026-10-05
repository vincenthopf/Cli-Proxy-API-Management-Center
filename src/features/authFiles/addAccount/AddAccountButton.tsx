import { useTranslation } from 'react-i18next';
import { Button, ButtonGroup, DropdownMenu } from '@cloudflare/kumo';
import { CaretDownIcon, PlusIcon, UploadSimpleIcon } from '@phosphor-icons/react';
import { CHOOSER_TARGET } from './addAccountLogic';

export interface AddAccountButtonProps {
  onAdd: (target: string) => void;
  onUpload: () => void;
  uploading?: boolean;
  disabled?: boolean;
}

export function AddAccountButton({
  onAdd,
  onUpload,
  uploading = false,
  disabled = false,
}: AddAccountButtonProps) {
  const { t } = useTranslation();
  return (
    <ButtonGroup aria-label={t('add_account.button')}>
      <Button
        variant="primary"
        icon={PlusIcon}
        loading={uploading}
        disabled={disabled}
        onClick={() => onAdd('anthropic')}
      >
        {t('add_account.add_claude')}
      </Button>
      <DropdownMenu>
        <DropdownMenu.Trigger
          render={
            <Button
              variant="primary"
              shape="square"
              disabled={disabled}
              aria-label={t('add_account.more_options')}
            >
              <CaretDownIcon />
            </Button>
          }
        />
        <DropdownMenu.Content>
          <DropdownMenu.Item onClick={() => onAdd('anthropic')}>
            {t('add_account.add_claude')}
          </DropdownMenu.Item>
          <DropdownMenu.Item onClick={() => onAdd('codex')}>
            {t('add_account.add_codex')}
          </DropdownMenu.Item>
          <DropdownMenu.Item onClick={() => onAdd(CHOOSER_TARGET)}>
            {t('add_account.other_provider')}
          </DropdownMenu.Item>
          <DropdownMenu.Separator />
          <DropdownMenu.Item icon={UploadSimpleIcon} disabled={uploading} onClick={onUpload}>
            {t('add_account.upload_file')}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>
    </ButtonGroup>
  );
}
