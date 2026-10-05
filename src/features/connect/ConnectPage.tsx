import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CopyIcon, KeyIcon, PlugsConnectedIcon } from '@phosphor-icons/react';
import {
  Badge,
  Button,
  ClipboardText,
  Code,
  Empty,
  LayerCard,
  LinkButton,
  SensitiveInput,
} from '@cloudflare/kumo';
import { modelsApi } from '@/services/api/models';
import { useAuthStore, useConfigStore } from '@/stores';
import { buildEnvSnippet, buildSettingsSnippet, KEY_PLACEHOLDER, maskKey } from './snippets';
import { PageHeader } from '@/features/overview/components/PageHeader';
import { SectionHeader } from '@/features/overview/components/SectionHeader';

type TestResult =
  | { state: 'idle' }
  | { state: 'running' }
  | { state: 'ok'; count: number }
  | { state: 'error'; message: string };

function CopyButton({ text }: { text: string }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };
  return (
    <Button variant="secondary" size="sm" icon={CopyIcon} onClick={() => void copy()}>
      {copied ? t('connect.copied') : t('connect.copy')}
    </Button>
  );
}

function Snippet({
  title,
  help,
  display,
  copyText,
  lang,
}: {
  title: string;
  help: string;
  display: string;
  copyText: string;
  lang: 'bash' | 'jsonc';
}) {
  return (
    <section className="flex flex-col gap-3">
      <SectionHeader title={title} description={help} actions={<CopyButton text={copyText} />} />
      <Code.Block lang={lang} code={display} />
    </section>
  );
}

export function ConnectPage() {
  const { t } = useTranslation();
  const apiBase = useAuthStore((s) => s.apiBase);
  const config = useConfigStore((s) => s.config);
  const fetchConfig = useConfigStore((s) => s.fetchConfig);
  const [test, setTest] = useState<TestResult>({ state: 'idle' });

  useEffect(() => {
    void fetchConfig().catch(() => undefined);
  }, [fetchConfig]);

  const baseUrl = useMemo(() => apiBase.replace(/\/+$/, ''), [apiBase]);
  const keys = useMemo(() => config?.apiKeys ?? [], [config?.apiKeys]);
  const firstKey = keys[0] ?? '';
  const shownKey = firstKey ? maskKey(firstKey) : KEY_PLACEHOLDER;
  const realKey = firstKey || KEY_PLACEHOLDER;

  const runTest = async () => {
    setTest({ state: 'running' });
    try {
      const models = await modelsApi.fetchModels(baseUrl, firstKey || undefined);
      setTest({ state: 'ok', count: models.length });
    } catch (err) {
      setTest({ state: 'error', message: err instanceof Error ? err.message : String(err) });
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t('connect.title')} description={t('connect.subtitle')} />

      <section className="flex flex-col gap-3">
        <SectionHeader
          title={t('connect.endpoint')}
          description={t('connect.endpoint_help')}
          actions={
            <>
              {test.state === 'ok' ? (
                <Badge variant="success">{t('connect.test_ok', { count: test.count })}</Badge>
              ) : null}
              {test.state === 'error' ? (
                <Badge variant="error">{t('connect.test_failed')}</Badge>
              ) : null}
              <Button
                variant="secondary"
                size="sm"
                icon={PlugsConnectedIcon}
                loading={test.state === 'running'}
                onClick={() => void runTest()}
              >
                {t('connect.test_button')}
              </Button>
            </>
          }
        />
        <LayerCard>
          <LayerCard.Primary className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-kumo-default">{t('connect.base_url')}</span>
              <ClipboardText
                text={baseUrl}
                size="base"
                tooltip={{ text: t('connect.copy'), copiedText: t('connect.copied') }}
                labels={{ copyAction: t('connect.copy') }}
              />
            </div>
            {test.state === 'error' ? (
              <span className="text-xs text-kumo-danger">{test.message}</span>
            ) : null}
            {keys.length === 0 ? (
              <Empty
                size="sm"
                icon={<KeyIcon size={32} className="text-kumo-inactive" />}
                title={t('connect.no_keys_title')}
                description={t('connect.no_keys')}
                contents={
                  <LinkButton variant="secondary" size="sm" href="/settings">
                    {t('connect.open_settings')}
                  </LinkButton>
                }
              />
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {keys.map((key, index) => (
                  <SensitiveInput
                    key={`${index}-${key.slice(-4)}`}
                    label={t('connect.client_key', { n: index + 1 })}
                    value={key}
                    readOnly
                  />
                ))}
              </div>
            )}
          </LayerCard.Primary>
        </LayerCard>
      </section>

      <Snippet
        title={t('connect.shell_title')}
        help={t('connect.shell_help')}
        lang="bash"
        display={buildEnvSnippet(baseUrl, shownKey)}
        copyText={buildEnvSnippet(baseUrl, realKey)}
      />

      <Snippet
        title={t('connect.settings_title')}
        help={t('connect.settings_help')}
        lang="jsonc"
        display={buildSettingsSnippet(baseUrl, shownKey)}
        copyText={buildSettingsSnippet(baseUrl, realKey)}
      />
    </div>
  );
}
