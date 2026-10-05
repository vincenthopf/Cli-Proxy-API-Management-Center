import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Dialog } from '@cloudflare/kumo';
import { ArrowLeftIcon, CaretRightIcon, XIcon } from '@phosphor-icons/react';
import { IconPlug } from '@/components/ui/icons';
import { authFilesApi } from '@/services/api';
import { useThemeStore } from '@/stores';
import iconVertex from '@/assets/icons/vertex.svg';
import { CHOOSER_TARGET, VERTEX_TARGET, newestAccountName } from './addAccountLogic';
import { authFileTypeForProvider, getIcon, type OAuthProviderCard } from './oauthProviders';
import { OAuthProviderFlow } from './OAuthProviderFlow';
import { VertexImportFlow } from './VertexImportFlow';
import { useOAuthFlows } from './useOAuthFlows';
import { useVertexImport } from './useVertexImport';

export interface AddAccountDialogProps {
  target: string | null;
  onTargetChange: (target: string | null) => void;
}

function ProviderIcon({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);
  if (src && !failed) {
    return <img src={src} alt="" className="size-5" onError={() => setFailed(true)} />;
  }
  return <IconPlug size={16} className="text-kumo-subtle" />;
}

function ChooserRow({
  icon,
  title,
  onSelect,
}: {
  icon: string;
  title: string;
  onSelect: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className="flex w-full cursor-pointer items-center gap-3 rounded-md px-2 py-2.5 text-left text-sm text-kumo-default outline-none hover:bg-kumo-tint focus-visible:ring-2 focus-visible:ring-kumo-brand"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-kumo-recessed">
          <ProviderIcon src={icon} />
        </span>
        <span className="min-w-0 flex-1 truncate font-medium">{title}</span>
        <CaretRightIcon size={14} className="shrink-0 text-kumo-subtle" />
      </button>
    </li>
  );
}

export function AddAccountDialog({ target, onTargetChange }: AddAccountDialogProps) {
  const { t } = useTranslation();
  const theme = useThemeStore((state) => state.resolvedTheme);
  const open = target !== null;
  const [pluginsRequested, setPluginsRequested] = useState(false);
  if (open && !pluginsRequested) setPluginsRequested(true);
  const flows = useOAuthFlows({ loadPlugins: pluginsRequested });
  const vertex = useVertexImport();
  const [accountName, setAccountName] = useState<string | null>(null);
  const autoStarted = useRef(new Set<string>());

  const provider: OAuthProviderCard | null =
    flows.providers.find((item) => item.id === target) ?? null;
  const step = target === VERTEX_TARGET ? 'vertex' : provider ? 'provider' : 'chooser';
  const providerState = provider ? (flows.states[provider.id] ?? {}) : {};
  const providerStatus = providerState.status;
  const { startAuth } = flows;

  useEffect(() => {
    if (!open) {
      autoStarted.current.clear();
      return;
    }
    if (!provider || autoStarted.current.has(provider.id)) return;
    autoStarted.current.add(provider.id);
    if (!providerStatus || providerStatus === 'idle') void startAuth(provider.id);
  }, [open, provider, providerStatus, startAuth]);

  const providerId = provider?.id ?? null;
  useEffect(() => {
    if (!providerId || providerStatus !== 'success') return;
    let cancelled = false;
    authFilesApi
      .list()
      .then((response) => {
        if (cancelled) return;
        setAccountName(
          newestAccountName(response.files ?? [], authFileTypeForProvider(providerId))
        );
      })
      .catch(() => {
        if (!cancelled) setAccountName(null);
      });
    return () => {
      cancelled = true;
      setAccountName(null);
    };
  }, [providerId, providerStatus]);

  const close = () => {
    for (const [id, state] of Object.entries(flows.states)) {
      const devinSessionOpen = id === 'devin' && Boolean(state.state);
      if ((state.status === 'success' || state.status === 'error') && !devinSessionOpen) {
        flows.resetProvider(id);
      }
    }
    if (vertex.state.result) vertex.reset();
    onTargetChange(null);
  };

  const title =
    step === 'vertex'
      ? t('vertex_import.title')
      : provider
        ? flows.providerTitle(provider)
        : t('add_account.dialog_title');
  const description =
    step === 'vertex'
      ? null
      : provider
        ? flows.providerText(provider, 'oauth_hint')
        : t('add_account.choose_description');

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
      }}
    >
      <Dialog size="lg" className="flex max-h-[90dvh] flex-col">
        <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4">
          <div className="flex min-w-0 flex-col gap-1">
            <Dialog.Title className="m-0 text-lg font-semibold text-kumo-default">
              {title}
            </Dialog.Title>
            {description ? (
              <Dialog.Description className="m-0 text-sm text-kumo-subtle">
                {description}
              </Dialog.Description>
            ) : null}
          </div>
          <Button
            variant="ghost"
            shape="square"
            size="sm"
            icon={<XIcon size={16} />}
            aria-label={t('add_account.close')}
            onClick={close}
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
          {step === 'chooser' ? (
            <div className="flex flex-col gap-4">
              <ul
                className="m-0 flex list-none flex-col p-0"
                aria-label={t('add_account.choose_title')}
              >
                {flows.providers.map((item) => (
                  <ChooserRow
                    key={item.id}
                    icon={item.kind === 'plugin' ? item.icon : getIcon(item.icon, theme)}
                    title={flows.providerTitle(item)}
                    onSelect={() => onTargetChange(item.id)}
                  />
                ))}
              </ul>
              <div className="flex flex-col gap-1 border-t border-kumo-hairline pt-4">
                <span className="px-2 text-xs font-medium text-kumo-subtle">
                  {t('auth_login.other_login_methods')}
                </span>
                <ul className="m-0 flex list-none flex-col p-0">
                  <ChooserRow
                    icon={iconVertex}
                    title={t('vertex_import.title')}
                    onSelect={() => onTargetChange(VERTEX_TARGET)}
                  />
                </ul>
              </div>
            </div>
          ) : null}

          {step === 'provider' && provider ? (
            <OAuthProviderFlow
              provider={provider}
              state={providerState}
              actions={flows}
              accountName={accountName}
              onDone={close}
            />
          ) : null}

          {step === 'vertex' ? <VertexImportFlow vertex={vertex} onDone={close} /> : null}
        </div>

        {step !== 'chooser' ? (
          <div className="flex items-center border-t border-kumo-hairline px-6 py-3">
            <Button
              variant="ghost"
              size="sm"
              icon={ArrowLeftIcon}
              onClick={() => onTargetChange(CHOOSER_TARGET)}
            >
              {t('add_account.change_provider')}
            </Button>
          </div>
        ) : null}
      </Dialog>
    </Dialog.Root>
  );
}
