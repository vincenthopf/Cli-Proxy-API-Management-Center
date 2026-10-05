import type { ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge, Select } from '@cloudflare/kumo';
import {
  ArrowsSplitIcon,
  CpuIcon,
  FileCodeIcon,
  GlobeIcon,
  KeyIcon,
  ScrollIcon,
  SquaresFourIcon,
  WrenchIcon,
  type IconProps,
} from '@phosphor-icons/react';
import {
  SETTINGS_SECTION_IDS,
  type SectionCounts,
  type SettingsSectionId,
} from '../settingsLayout';

const SECTION_ICONS: Record<SettingsSectionId, ComponentType<IconProps>> = {
  overview: SquaresFourIcon,
  access: KeyIcon,
  routing: ArrowsSplitIcon,
  logging: ScrollIcon,
  network: GlobeIcon,
  providers: CpuIcon,
  advanced: WrenchIcon,
  yaml: FileCodeIcon,
};

export type SettingsNavProps = {
  active: SettingsSectionId;
  changedCounts: SectionCounts;
  errorCounts: SectionCounts;
  sourceDirty: boolean;
  onSelect: (section: SettingsSectionId) => void;
};

export function SettingsNav({
  active,
  changedCounts,
  errorCounts,
  sourceDirty,
  onSelect,
}: SettingsNavProps) {
  const { t } = useTranslation();
  const title = (id: SettingsSectionId) => t(`settings.sections.${id}.title`);
  const marker = (id: SettingsSectionId) => {
    const errors = errorCounts[id] ?? 0;
    if (errors > 0) {
      return <Badge variant="error">{t('settings.nav.errors', { count: errors })}</Badge>;
    }
    const changed = id === 'yaml' ? (sourceDirty ? 1 : 0) : (changedCounts[id] ?? 0);
    if (changed > 0) {
      return (
        <Badge variant="info">
          {id === 'yaml' ? t('settings.nav.edited') : t('settings.nav.changed', { count: changed })}
        </Badge>
      );
    }
    return null;
  };

  return (
    <>
      <div className="md:hidden">
        <Select
          className="w-full"
          aria-label={t('settings.nav.label')}
          value={active}
          renderValue={(value: SettingsSectionId) => title(value)}
          items={SETTINGS_SECTION_IDS.map((id) => ({ value: id, label: title(id) }))}
          onValueChange={(next: SettingsSectionId | null) => {
            if (next) onSelect(next);
          }}
        />
      </div>
      <nav aria-label={t('settings.nav.label')} className="hidden md:block">
        <ul className="flex flex-col gap-0.5">
          {SETTINGS_SECTION_IDS.map((id) => {
            const Icon = SECTION_ICONS[id];
            const current = id === active;
            return (
              <li key={id}>
                <button
                  type="button"
                  aria-current={current ? 'page' : undefined}
                  onClick={() => onSelect(id)}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors focus-visible:ring-2 focus-visible:ring-kumo-brand focus-visible:outline-none ${
                    current
                      ? 'bg-kumo-tint font-medium text-kumo-default'
                      : 'text-kumo-subtle hover:bg-kumo-tint hover:text-kumo-default'
                  }`}
                >
                  <Icon aria-hidden="true" className="size-4 shrink-0" />
                  <span className="min-w-0 flex-1 truncate">{title(id)}</span>
                  {marker(id)}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
