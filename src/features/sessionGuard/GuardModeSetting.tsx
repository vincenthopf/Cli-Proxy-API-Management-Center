import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Banner, Radio } from '@cloudflare/kumo';
import { WarningCircleIcon } from '@phosphor-icons/react';
import { SectionHeader } from '@/features/overview/components/SectionHeader';
import { sessionGuardApi, type SessionGuardMode } from '@/services/api/sessionGuard';

const MODES: SessionGuardMode[] = ['confirm', 'auto'];

const isMode = (value: unknown): value is SessionGuardMode =>
  typeof value === 'string' && (MODES as string[]).includes(value);

export interface GuardModeSettingProps {
  mode: SessionGuardMode | null;
  available: boolean;
  loading?: boolean;
  onChanged: () => Promise<void> | void;
}

export function GuardModeSetting({
  mode,
  available,
  loading = false,
  onChanged,
}: GuardModeSettingProps) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState<SessionGuardMode | null>(null);
  const [error, setError] = useState<string | null>(null);

  const change = async (next: SessionGuardMode) => {
    if (next === mode) return;
    setSaving(next);
    setError(null);
    try {
      await sessionGuardApi.setMode(next);
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(null);
    }
  };

  return (
    <section className="flex flex-col gap-3">
      <SectionHeader
        title={t('session_guard.mode_title')}
        description={
          available || loading ? t('session_guard.mode_help') : t('session_guard.mode_unavailable')
        }
      />
      {error ? (
        <Banner
          variant="error"
          icon={<WarningCircleIcon weight="fill" />}
          description={t('session_guard.mode_error', { error })}
        />
      ) : null}
      <Radio.Group
        legend={t('session_guard.mode_title')}
        appearance="card"
        orientation="horizontal"
        value={saving ?? mode ?? ''}
        disabled={!available || saving !== null}
        onValueChange={(value) => isMode(value) && void change(value)}
        className="[&_legend]:sr-only"
      >
        {MODES.map((item) => (
          <Radio.Item
            key={item}
            value={item}
            label={t(`session_guard.mode_${item}`)}
            description={t(`session_guard.mode_${item}_help`)}
          />
        ))}
      </Radio.Group>
    </section>
  );
}
