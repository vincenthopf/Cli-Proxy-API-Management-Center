import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { useAuthStore, useConfigStore } from '@/stores';
import styles from '@/features/overview/Overview.module.scss';

const mask = (value: string) =>
  value.length <= 10 ? '••••••' : `${value.slice(0, 6)}••••••${value.slice(-4)}`;

export function ConnectPage() {
  const { t } = useTranslation();
  const apiBase = useAuthStore((s) => s.apiBase);
  const config = useConfigStore((s) => s.config);
  const fetchConfig = useConfigStore((s) => s.fetchConfig);
  const [revealed, setRevealed] = useState<number | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    void fetchConfig();
  }, [fetchConfig]);

  const baseUrl = useMemo(() => apiBase.replace(/\/+$/, ''), [apiBase]);
  const keys = config?.apiKeys ?? [];
  const firstKey = keys[0] ?? '<client key>';

  const copy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      window.setTimeout(() => setCopied(null), 1500);
    } catch {
      setCopied(null);
    }
  };

  const envSnippet = `export ANTHROPIC_BASE_URL="${baseUrl}"\nexport ANTHROPIC_AUTH_TOKEN="${mask(firstKey)}"\nexport CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY=1\nexport API_TIMEOUT_MS=600000`;
  const envCopy = envSnippet.replace(mask(firstKey), firstKey);
  const settingsSnippet = JSON.stringify(
    {
      env: {
        ANTHROPIC_BASE_URL: baseUrl,
        ANTHROPIC_AUTH_TOKEN: mask(firstKey),
        CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY: '1',
        API_TIMEOUT_MS: '600000',
      },
    },
    null,
    2
  );
  const settingsCopy = settingsSnippet.replace(mask(firstKey), firstKey);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{t('connect.title')}</h1>
          <p className={styles.subtitle}>{t('connect.subtitle')}</p>
        </div>
      </header>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>{t('connect.endpoint')}</h2>
        </div>
        <div className={styles.table}>
          <div className={styles.kv}>
            <span className={styles.kvLabel}>{t('connect.base_url')}</span>
            <span className={styles.mono}>{baseUrl}</span>
            <Button variant="ghost" size="sm" onClick={() => void copy('base', baseUrl)}>
              {copied === 'base' ? t('connect.copied') : t('connect.copy')}
            </Button>
          </div>
          {keys.length === 0 ? (
            <div className={styles.empty}>{t('connect.no_keys')}</div>
          ) : null}
          {keys.map((key, i) => (
            <div className={styles.kv} key={`${i}-${key.slice(-4)}`}>
              <span className={styles.kvLabel}>{t('connect.client_key', { n: i + 1 })}</span>
              <span className={styles.mono}>{revealed === i ? key : mask(key)}</span>
              <span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setRevealed(revealed === i ? null : i)}
                >
                  {revealed === i ? t('connect.hide') : t('connect.reveal')}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => void copy(`key-${i}`, key)}>
                  {copied === `key-${i}` ? t('connect.copied') : t('connect.copy')}
                </Button>
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>{t('connect.shell_title')}</h2>
          <Button variant="secondary" size="sm" onClick={() => void copy('env', envCopy)}>
            {copied === 'env' ? t('connect.copied') : t('connect.copy')}
          </Button>
        </div>
        <div className={styles.table}>
          <pre className={styles.code}>{envSnippet}</pre>
        </div>
        <p className={styles.footnote}>{t('connect.shell_help')}</p>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>{t('connect.settings_title')}</h2>
          <Button variant="secondary" size="sm" onClick={() => void copy('settings', settingsCopy)}>
            {copied === 'settings' ? t('connect.copied') : t('connect.copy')}
          </Button>
        </div>
        <div className={styles.table}>
          <pre className={styles.code}>{settingsSnippet}</pre>
        </div>
        <p className={styles.footnote}>{t('connect.settings_help')}</p>
      </section>
    </div>
  );
}
